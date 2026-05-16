import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackoffInterval } from "../hooks/useBackoffInterval";
import {
  Group,
  Button,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Text,
  Divider,
  Paper,
  Loader,
  Alert,
  Badge,
  Progress,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  getConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  getMe,
  uploadAudio,
  getImportJobs,
} from "../lib/api";
import type { ConversationResponse, ScopeType } from "../dto/conversations";

interface Props {
  organizationId: string;
  scopeId?: string;
  scopeType?: ScopeType;
  queryKey: string[];
}

export function ConversationsSection({ organizationId, scopeId, scopeType, queryKey }: Props) {
  const queryClient = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
  const [editConv, setEditConv] = useState<ConversationResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  // A conversation is "pending transcript" if it has a non-array content and was created
  // recently enough that transcription might still be running (within 2 hours).
  const TWO_HOURS = 2 * 60 * 60 * 1_000;
  const [hasPending, setHasPending] = useState(false);
  const refetchInterval = useBackoffInterval(hasPending);

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["conversations", ...queryKey],
    queryFn: () =>
      getConversations(
        scopeId && scopeType
          ? { scope_id: scopeId, scope_type: scopeType }
          : { organization_id: organizationId },
      ),
    retry: false,
    refetchInterval,
  });

  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    const pending = data.some(
      (c) => !Array.isArray(c.content) && now - new Date(c.timestamp).getTime() < TWO_HOURS,
    );
    setHasPending(pending);
  }, [dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["conversations", ...queryKey] });

  const createMutation = useMutation({
    mutationFn: () =>
      createConversation({
        title,
        content,
        organization_id: organizationId,
        scope_id: scopeId,
        scope_type: scopeType ?? undefined,
      }),
    onSuccess: () => {
      invalidate();
      closeCreate();
      setTitle("");
      setContent("");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("No file selected");
      const conv = await createConversation({
        title: uploadTitle || audioFile.name,
        content: "",
        organization_id: organizationId,
        scope_id: scopeId,
        scope_type: scopeType ?? undefined,
      });
      await uploadAudio(conv.id, audioFile);
    },
    onSuccess: () => {
      invalidate();
      closeUpload();
      setUploadTitle("");
      setAudioFile(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateConversation(editConv!.id, { title: editTitle, content: editContent }),
    onSuccess: () => {
      invalidate();
      setEditConv(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: invalidate,
  });

  const openEdit = (conv: ConversationResponse) => {
    setEditConv(conv);
    setEditTitle(conv.title);
    setEditContent(typeof conv.content === "string" ? conv.content : "");
  };

  const canMutate = (conv: ConversationResponse) => me?.id === conv.created_by;

  return (
    <>
      {/* Create modal */}
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title="New conversation"
        centered
        size="lg"
      >
        <Stack>
          <TextInput
            label="Title"
            placeholder="My conversation"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            data-autofocus
          />
          <Textarea
            label="Content"
            placeholder="What's this conversation about?"
            value={content}
            onChange={(e) => setContent(e.currentTarget.value)}
            rows={4}
          />
          {createMutation.isError && (
            <Text size="sm" c="red">
              {String(createMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Upload audio modal */}
      <Modal
        opened={uploadOpened}
        onClose={closeUpload}
        title="Upload audio"
        centered
        size="md"
      >
        <Stack>
          <TextInput
            label="Title"
            placeholder="Leave blank to use filename"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.currentTarget.value)}
          />
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Audio file
            </Text>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
              style={{ display: "none" }}
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            />
            <Group>
              <Button variant="default" size="xs" onClick={() => fileRef.current?.click()}>
                Choose file
              </Button>
              {audioFile && (
                <Text size="xs" c="dimmed">
                  {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                </Text>
              )}
            </Group>
          </Stack>
          {uploadMutation.isPending && <Progress animated value={100} size="xs" />}
          {uploadMutation.isError && (
            <Text size="sm" c="red">
              {String(uploadMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeUpload} disabled={uploadMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              loading={uploadMutation.isPending}
              disabled={!audioFile}
            >
              Upload &amp; transcribe
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit modal */}
      <Modal
        opened={editConv !== null}
        onClose={() => setEditConv(null)}
        title="Edit conversation"
        centered
        size="lg"
      >
        <Stack>
          <TextInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
            data-autofocus
          />
          <Textarea
            label="Content"
            value={editContent}
            onChange={(e) => setEditContent(e.currentTarget.value)}
            rows={4}
          />
          {updateMutation.isError && (
            <Text size="sm" c="red">
              {String(updateMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditConv(null)}>
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600} size="sm" c="dimmed">
            CONVERSATIONS
          </Text>
          <Group gap={6}>
            <Button size="xs" variant="light" color="teal" onClick={openUpload}>
              Upload audio
            </Button>
            <Button size="xs" variant="light" onClick={openCreate}>
              New
            </Button>
          </Group>
        </Group>

        {isLoading && <Loader size="sm" />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && (
          <Text size="sm" c="dimmed">
            No conversations yet.
          </Text>
        )}

        {data?.map((conv) => (
          <ConversationCard
            key={conv.id}
            conv={conv}
            canMutate={canMutate(conv)}
            onEdit={() => openEdit(conv)}
            onDelete={() => deleteMutation.mutate(conv.id)}
            deleteLoading={deleteMutation.isPending && deleteMutation.variables === conv.id}
          />
        ))}
      </Stack>
      <Divider mt="xl" />
    </>
  );
}

function ConversationCard({
  conv,
  canMutate,
  onEdit,
  onDelete,
  deleteLoading,
}: {
  conv: ConversationResponse;
  canMutate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteLoading: boolean;
}) {
  // Poll imports to know if a file was uploaded (determines if transcription badge should show)
  const { data: importJobs } = useQuery({
    queryKey: ["import-jobs", conv.id],
    queryFn: () => getImportJobs(conv.id),
    retry: false,
  });

  const hasAudio = (importJobs?.length ?? 0) > 0;
  const hasTranscript = Array.isArray(conv.content);
  const isTranscribing = hasAudio && !hasTranscript;

  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            <Text
              fw={500}
              size="sm"
              component={Link}
              to={`/conversations/${conv.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {conv.title}
            </Text>
            {isTranscribing && (
              <Badge size="xs" color="yellow" variant="dot">
                transcribing…
              </Badge>
            )}
            {hasTranscript && (
              <Badge size="xs" color="teal" variant="dot">
                transcript
              </Badge>
            )}
          </Group>
          {typeof conv.content === "string" && conv.content && !hasTranscript && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {conv.content}
            </Text>
          )}
          {conv.stats.duration_seconds != null && (
            <Text size="xs" c="dimmed">
              {Math.round(conv.stats.duration_seconds)}s · {conv.stats.word_count} words
            </Text>
          )}
          <Group gap={4} mt={4}>
            <Text size="xs" c="dimmed">
              {new Date(conv.timestamp).toLocaleDateString()}
            </Text>
            {conv.tag_ids.length > 0 && (
              <Badge size="xs" variant="dot" color="blue">
                {conv.tag_ids.length} tag{conv.tag_ids.length > 1 ? "s" : ""}
              </Badge>
            )}
          </Group>
        </Stack>

        {canMutate && (
          <Group gap={4} wrap="nowrap">
            <Button size="xs" variant="subtle" onClick={onEdit}>
              Edit
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              loading={deleteLoading}
              onClick={onDelete}
            >
              Delete
            </Button>
          </Group>
        )}
      </Group>
    </Paper>
  );
}
