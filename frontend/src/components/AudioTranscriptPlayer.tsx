import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { Box, Text, ActionIcon, Group, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";
import type { SpeakerTurn, TranscriptWord } from "../dto/conversations";

interface Props {
  audioUrl: string;
  turns: SpeakerTurn[];
  duration: number;
}

const SPEAKER_NAMES = ["Speaker A", "Speaker B"] as const;

// Flat list of all words with their turn index, for seeking
interface WordEntry {
  word: TranscriptWord;
  turnIdx: number;
  wordIdx: number;
}

function buildWordIndex(turns: SpeakerTurn[]): WordEntry[] {
  const entries: WordEntry[] = [];
  turns.forEach((turn, ti) => {
    turn.words.forEach((w, wi) => {
      entries.push({ word: w, turnIdx: ti, wordIdx: wi });
    });
  });
  return entries;
}

function findActiveWord(words: WordEntry[], time: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].word.start <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // Only consider active if we're within the word's end time (with 0.1s tolerance)
  if (result >= 0 && time > words[result].word.end + 0.1) return -1;
  return result;
}

export function AudioTranscriptPlayer({ audioUrl, turns, duration }: Props) {
  const theme = useMantineTheme();
  const scheme = useComputedColorScheme("light");
  const waveRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const wordRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const userScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const wordIndex = buildWordIndex(turns);
  const activeWordIdx = findActiveWord(wordIndex, currentTime);

  // Init WaveSurfer
  useEffect(() => {
    if (!waveRef.current) return;

    const waveColor = scheme === "dark" ? "#555" : "#ccc";
    const progressColor = theme.colors.blue[6];

    const ws = WaveSurfer.create({
      container: waveRef.current,
      waveColor,
      progressColor,
      height: 56,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      url: audioUrl,
      interact: true,
    });

    ws.on("timeupdate", (t) => setCurrentTime(t));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    wsRef.current = ws;
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [audioUrl, scheme]);

  // Auto-scroll transcript to active word
  useEffect(() => {
    if (activeWordIdx < 0 || userScrolling.current) return;
    const entry = wordIndex[activeWordIdx];
    const key = `${entry.turnIdx}-${entry.wordIdx}`;
    const el = wordRefs.current.get(key);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeWordIdx]);

  // Detect manual scroll → pause auto-scroll for 3s
  const onScroll = useCallback(() => {
    userScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      userScrolling.current = false;
    }, 3000);
  }, []);

  const seekTo = useCallback((start: number) => {
    if (!wsRef.current || duration <= 0) return;
    wsRef.current.seekTo(Math.max(0, Math.min(1, start / duration)));
    wsRef.current.play();
  }, [duration]);

  const isDark = scheme === "dark";

  return (
    <Box>
      {/* Waveform + play/pause */}
      <Group gap="xs" align="center">
        <ActionIcon
          size="lg"
          variant="light"
          onClick={() => wsRef.current?.playPause()}
        >
          {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
        </ActionIcon>
        <Box
          ref={waveRef}
          style={{
            flex: 1,
            borderRadius: theme.radius.sm,
            overflow: "hidden",
            background: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
            padding: "8px 12px",
            cursor: "pointer",
          }}
        />
      </Group>

      {/* Scrollable transcript */}
      <Box
        ref={transcriptRef}
        onScroll={onScroll}
        style={{
          height: "60vh",
          overflowY: "auto",
          marginTop: 16,
          paddingRight: 4,
        }}
      >
        {turns.map((turn, ti) => {
          const colorKey = SPEAKER_NAMES.indexOf(turn.speaker as typeof SPEAKER_NAMES[number]);
          const color = theme.colors[colorKey === 1 ? "violet" : "blue"][6];

          return (
            <Box key={ti} mb="lg">
              <Text size="xs" fw={700} style={{ color }} mb={6}>
                {turn.speaker}
              </Text>
              <Text size="sm" style={{ lineHeight: 1.8 }}>
                {turn.words.length > 0
                  ? turn.words.map((w, wi) => {
                      const flatIdx = wordIndex.findIndex(
                        (e) => e.turnIdx === ti && e.wordIdx === wi,
                      );
                      const isActive = flatIdx === activeWordIdx;
                      const key = `${ti}-${wi}`;
                      return (
                        <span
                          key={wi}
                          ref={(el) => {
                            if (el) wordRefs.current.set(key, el);
                            else wordRefs.current.delete(key);
                          }}
                          onClick={() => seekTo(w.start)}
                          style={{
                            cursor: "pointer",
                            borderRadius: 3,
                            padding: "1px 2px",
                            background: isActive
                              ? isDark
                                ? theme.colors.blue[8]
                                : theme.colors.blue[1]
                              : "transparent",
                            color: isActive ? (isDark ? "#fff" : theme.colors.blue[8]) : "inherit",
                            fontWeight: isActive ? 600 : undefined,
                            transition: "background 0.15s, color 0.15s",
                          }}
                        >
                          {w.word}
                        </span>
                      );
                    })
                  : turn.text}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
