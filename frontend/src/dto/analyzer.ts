import { z } from "zod";

export const TranscriptSegment = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
});

export const Transcript = z.object({
  language: z.string(),
  duration_seconds: z.number(),
  word_count: z.number(),
  full_text: z.string(),
  segments: z.array(TranscriptSegment),
});

export const AnalysisJob = z.object({
  id: z.string().uuid(),
  import_job_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  storage_key: z.string(),
  status: z.enum(["pending", "processing", "done", "failed"]),
  attempts: z.number(),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  transcript: Transcript.nullable(),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegment>;
export type Transcript = z.infer<typeof Transcript>;
export type AnalysisJob = z.infer<typeof AnalysisJob>;
