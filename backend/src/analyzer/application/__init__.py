import asyncio
import os
from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.analyzer.domain import AnalysisJob, Transcript, TranscriptSegment, TranscriptWord
from src.analyzer.domain.events import TranscriptFailed, TranscriptReady
from src.analyzer.infrastructure.repositories import MongoAnalysisJobRepository
from src.shared.events import publish

_queue: asyncio.Queue[UUID] = asyncio.Queue()
_model = None
_model_lock = asyncio.Lock()

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/tmp/ddd_storage")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "tiny")


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _model


def _compute_speaker_turns(segments: list) -> list[dict]:
    """Group consecutive segments into speaker turns using gap heuristic."""
    if not segments:
        return []
    turns: list[dict] = []
    speaker = 0
    for i, seg in enumerate(segments):
        if i > 0 and seg.start - segments[i - 1].end > 1.5:
            speaker ^= 1
        label = f"Speaker {'AB'[speaker]}"
        if turns and turns[-1]["speaker"] == label:
            turns[-1]["text"] += " " + seg.text.strip()
        else:
            turns.append({"speaker": label, "text": seg.text.strip()})
    return turns


def _transcribe(file_path: str):
    return _get_model().transcribe(file_path, beam_size=5, word_timestamps=True)


async def enqueue(job_id: UUID) -> None:
    await _queue.put(job_id)


async def _process_one(job_id: UUID, db: AsyncIOMotorDatabase) -> None:
    repo = MongoAnalysisJobRepository(db)
    job = await repo.find_by_id(job_id)
    if job is None:
        return

    job.start()
    await repo.update(job)

    file_path = os.path.join(STORAGE_DIR, job.storage_key)
    try:
        async with _model_lock:
            loop = asyncio.get_event_loop()
            segments_raw, info = await loop.run_in_executor(None, lambda: _transcribe(file_path))

        segments: list[TranscriptSegment] = []
        for s in segments_raw:
            words = [
                TranscriptWord(
                    start=w.start,
                    end=w.end,
                    word=w.word,
                    probability=w.probability,
                )
                for w in (s.words or [])
            ]
            segments.append(TranscriptSegment(start=s.start, end=s.end, text=s.text, words=words))

        transcript = Transcript(
            segments=segments,
            language=info.language,
            duration_seconds=info.duration,
        )
        job.complete(transcript)
        await repo.update(job)
        speaker_turns = _compute_speaker_turns(segments)
        await publish(
            TranscriptReady(
                job_id=job.id,
                conversation_id=job.conversation_id,
                full_text=transcript.full_text,
                word_count=transcript.word_count,
                duration_seconds=transcript.duration_seconds,
                speaker_turns=speaker_turns,
            )
        )
    except Exception as exc:
        reason = str(exc)
        job.fail(reason)
        await repo.update(job)
        await publish(
            TranscriptFailed(job_id=job.id, conversation_id=job.conversation_id, reason=reason)
        )
        if job.can_retry:
            job_copy = AnalysisJob.create(
                import_job_id=job.import_job_id,
                conversation_id=job.conversation_id,
                storage_key=job.storage_key,
            )
            job_copy.attempts = job.attempts
            await repo.save(job_copy)
            await _queue.put(job_copy.id)


async def worker(db: AsyncIOMotorDatabase) -> None:
    print("[analyzer] worker started")
    while True:
        job_id = await _queue.get()
        try:
            await _process_one(job_id, db)
        except Exception as exc:
            print(f"[analyzer] unhandled error processing {job_id}: {exc}")
        finally:
            _queue.task_done()
