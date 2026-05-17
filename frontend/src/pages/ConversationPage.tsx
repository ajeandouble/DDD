import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Stack,
  Text,
  Title,
  Group,
  Badge,
  Paper,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { getConversation, getImportJobs } from "../lib/api";
import { AudioTranscriptPlayer } from "../components/AudioTranscriptPlayer";
import type { SpeakerTurn } from "../dto/conversations";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ConversationPage() {
  const { convId } = useParams<{ convId: string }>();
  const navigate = useNavigate();

  const { data: conv, isLoading } = useQuery({
    queryKey: ["conversation", convId],
    queryFn: () => getConversation(convId!),
    enabled: !!convId,
    refetchInterval: (query) => {
      const c = query.state.data;
      if (!c) return 3000;
      return c.type === "conversation" && Array.isArray(c.content) && c.content.length === 0
        ? 3000
        : false;
    },
    retry: false,
  });

  const { data: importJobs } = useQuery({
    queryKey: ["import-jobs", convId],
    queryFn: () => getImportJobs(convId!),
    enabled: !!convId,
    retry: false,
  });

  if (isLoading) return <Loader size="sm" />;
  if (!conv) return <Alert color="red">Conversation not found</Alert>;

  const storageKey = importJobs?.find((j) => j.storage_key)?.storage_key ?? null;
  const audioUrl = storageKey ? `/api/storage/${storageKey}` : null;
  const turns =
    conv.type === "conversation" && Array.isArray(conv.content) && conv.content.length > 0
      ? (conv.content as SpeakerTurn[])
      : null;
  const isTranscribing = !!storageKey && conv.type === "conversation" && !turns;

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Tooltip label="Back">
          <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} />
          </ActionIcon>
        </Tooltip>
        <Title order={3} style={{ flex: 1 }}>
          {conv.title}
        </Title>
      </Group>

      <Group gap="xs">
        <Text size="xs" c="dimmed">
          {new Date(conv.conversation_timestamp).toLocaleString()}
        </Text>
        {conv.stats.duration_seconds != null && (
          <Badge size="xs" variant="outline">
            {formatTime(conv.stats.duration_seconds)}
          </Badge>
        )}
        {conv.stats.word_count != null && (
          <Badge size="xs" variant="outline">
            {conv.stats.word_count} words
          </Badge>
        )}
        {isTranscribing && (
          <Badge size="xs" color="yellow" variant="dot">
            Transcribing…
          </Badge>
        )}
      </Group>

      {turns && audioUrl ? (
        <AudioTranscriptPlayer
          audioUrl={audioUrl}
          turns={turns}
          duration={conv.stats.duration_seconds ?? 0}
        />
      ) : turns ? (
        // Transcript without audio (text-only turns)
        <Stack gap="md">
          <Text size="sm" c="dimmed" fw={600}>
            TRANSCRIPT
          </Text>
          {turns.map((t, i) => (
            <Paper key={i} withBorder p="sm" radius="sm">
              <Text size="xs" fw={700} c={i % 2 === 0 ? "blue" : "violet"} mb={4}>
                {t.speaker}
              </Text>
              <Text size="sm">{t.text}</Text>
            </Paper>
          ))}
        </Stack>
      ) : isTranscribing ? (
        <Text size="sm" c="dimmed">
          Transcription in progress…
        </Text>
      ) : typeof conv.content === "string" && conv.content ? (
        <Paper withBorder p="md" radius="sm">
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {conv.content}
          </Text>
        </Paper>
      ) : (
        <Text size="sm" c="dimmed">
          No content yet.
        </Text>
      )}
    </Stack>
  );
}
