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
  SegmentedControl,
  ActionIcon,
  Select,
  Pagination,
  Collapse,
} from "@mantine/core";
import { IconPlus, IconTrash, IconSearch } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import {
  searchConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  getMe,
  uploadAudio,
  getImportJobs,
} from "../lib/api";
import type { ConvFilter, FilterField, FilterOp } from "../lib/api";
import type { ConversationResponse } from "../dto/conversations";

type MetaRow = { key: string; value: string };

// ---- Filter panel ----

const FIELD_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "content", label: "Content" },
  { value: "meta", label: "Metadata" },
  { value: "stats.word_count", label: "Word count" },
  { value: "stats.duration_seconds", label: "Duration (s)" },
];

const STRING_OPS = [
  { value: "eq", label: "==" },
  { value: "contains", label: "contains" },
  { value: "regex", label: "regex" },
];

const NUM_OPS = [
  { value: "eq", label: "==" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
];

function isNumericField(f: FilterField) {
  return f === "stats.word_count" || f === "stats.duration_seconds";
}

function FilterRow({
  filter,
  onChange,
  onRemove,
}: {
  filter: ConvFilter;
  onChange: (f: ConvFilter) => void;
  onRemove: () => void;
}) {
  const ops = isNumericField(filter.field) ? NUM_OPS : STRING_OPS;
  return (
    <Group gap={6} wrap="nowrap" align="flex-end">
      <Select
        size="xs"
        style={{ width: 140 }}
        data={FIELD_OPTIONS}
        value={filter.field}
        onChange={(v) =>
          onChange({ ...filter, field: v as FilterField, op: "eq", value: "", meta_key: "" })
        }
      />
      {filter.field === "meta" && (
        <TextInput
          size="xs"
          placeholder="key"
          style={{ width: 90 }}
          value={filter.meta_key ?? ""}
          onChange={(e) => onChange({ ...filter, meta_key: e.currentTarget.value })}
        />
      )}
      <Select
        size="xs"
        style={{ width: 90 }}
        data={ops}
        value={filter.op}
        onChange={(v) => onChange({ ...filter, op: v as FilterOp })}
      />
      <TextInput
        size="xs"
        placeholder="value"
        style={{ flex: 1 }}
        value={filter.value}
        onChange={(e) => onChange({ ...filter, value: e.currentTarget.value })}
      />
      <ActionIcon size="xs" variant="subtle" color="red" onClick={onRemove}>
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}

function FilterPanel({
  value,
  onChange,
  onApply,
  onClear,
}: {
  value: ConvFilter[];
  onChange: (v: ConvFilter[]) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const add = () =>
    onChange([...value, { field: "content", op: "contains", value: "", meta_key: "" }]);
  const update = (i: number, f: ConvFilter) => onChange(value.map((r, idx) => (idx === i ? f : r)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <Paper withBorder p="xs" radius="sm">
      <Stack gap={6}>
        {value.map((f, i) => (
          <FilterRow
            key={i}
            filter={f}
            onChange={(nf) => update(i, nf)}
            onRemove={() => remove(i)}
          />
        ))}
        <Group justify="space-between">
          <Button size="xs" variant="subtle" leftSection={<IconPlus size={13} />} onClick={add}>
            Add filter
          </Button>
          <Group gap={6}>
            <Button size="xs" variant="subtle" color="dimmed" onClick={onClear}>
              Clear
            </Button>
            <Button size="xs" onClick={onApply} leftSection={<IconSearch size={13} />}>
              Search
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}

function MetadataEditor({
  value,
  onChange,
}: {
  value: MetaRow[];
  onChange: (v: MetaRow[]) => void;
}) {
  const add = () => onChange([...value, { key: "", value: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const set = (i: number, field: "key" | "value", v: string) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));

  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          Metadata
        </Text>
        <ActionIcon size="xs" variant="subtle" onClick={add}>
          <IconPlus size={14} />
        </ActionIcon>
      </Group>
      {value.map((row, i) => (
        <Group key={i} gap={6} wrap="nowrap">
          <TextInput
            placeholder="key"
            value={row.key}
            onChange={(e) => set(i, "key", e.currentTarget.value)}
            style={{ flex: 1 }}
            size="xs"
          />
          <TextInput
            placeholder="value"
            value={row.value}
            onChange={(e) => set(i, "value", e.currentTarget.value)}
            style={{ flex: 2 }}
            size="xs"
          />
          <ActionIcon size="xs" variant="subtle" color="red" onClick={() => remove(i)}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      {value.length === 0 && (
        <Text size="xs" c="dimmed">
          No metadata — click + to add a key/value pair.
        </Text>
      )}
    </Stack>
  );
}

type TurnRow = { speaker: string; text: string };

function SpeakerTurnsEditor({
  value,
  onChange,
}: {
  value: TurnRow[];
  onChange: (v: TurnRow[]) => void;
}) {
  const add = () => {
    const last = value[value.length - 1];
    const nextSpeaker = last?.speaker === "Speaker A" ? "Speaker B" : "Speaker A";
    onChange([...value, { speaker: nextSpeaker, text: "" }]);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const set = (i: number, field: "speaker" | "text", v: string) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));

  return (
    <Stack gap={8}>
      {value.map((row, i) => (
        <Stack key={i} gap={4}>
          <Group gap={6} wrap="nowrap">
            <TextInput
              placeholder="Speaker A"
              value={row.speaker}
              onChange={(e) => set(i, "speaker", e.currentTarget.value)}
              size="xs"
              style={{ width: 120 }}
            />
            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => remove(i)} ml="auto">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          <Textarea
            placeholder="What they said…"
            value={row.text}
            onChange={(e) => set(i, "text", e.currentTarget.value)}
            rows={2}
            size="xs"
          />
        </Stack>
      ))}
      <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={add}>
        Add turn
      </Button>
    </Stack>
  );
}

interface Props {
  organizationId: string;
  scopeId: string;
  scopeType?: "campaign";
  queryKey: string[];
}

export function ConversationsSection({ organizationId, scopeId, scopeType, queryKey }: Props) {
  const queryClient = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
  const [editConv, setEditConv] = useState<ConversationResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentMode, setContentMode] = useState<"text" | "turns">("text");
  const [turns, setTurns] = useState<TurnRow[]>([{ speaker: "Speaker A", text: "" }]);
  const [metadata, setMetadata] = useState<MetaRow[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [conversationTs, setConversationTs] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadConversationTs, setUploadConversationTs] = useState("");
  const [uploadMetadata, setUploadMetadata] = useState<MetaRow[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  // Search / pagination / sort state
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [filtersOpen, { toggle: toggleFilters }] = useDisclosure(false);
  const [activeFilters, setActiveFilters] = useState<ConvFilter[]>([]);
  const [draftFilters, setDraftFilters] = useState<ConvFilter[]>([]);
  const [sortBy, setSortBy] = useState("conversation_timestamp");
  const [sortDir, setSortDir] = useState(-1);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir((d) => (d === -1 ? 1 : -1));
    else {
      setSortBy(field);
      setSortDir(-1);
    }
    setPage(1);
  };

  // A conversation is "pending transcript" if type="conversation" but content is empty (awaiting transcription).
  const [hasPending, setHasPending] = useState(false);
  const refetchInterval = useBackoffInterval(hasPending);

  const scopeParams =
    scopeId && scopeType
      ? { scope_id: scopeId, scope_type: scopeType }
      : { organization_id: organizationId };

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["conversations", ...queryKey, page, activeFilters, sortBy, sortDir],
    queryFn: () =>
      searchConversations(scopeParams, {
        filters: activeFilters,
        page,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
        sort_dir: sortDir,
      }),
    retry: false,
    refetchInterval,
  });

  useEffect(() => {
    if (!data) return;
    const pending = data.items.some(
      (c) => c.type === "conversation" && Array.isArray(c.content) && c.content.length === 0
    );
    setHasPending(pending);
  }, [dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["conversations", ...queryKey] });

  const createMutation = useMutation({
    mutationFn: () => {
      const isConversation = contentMode === "turns";
      const structuredContent = isConversation
        ? turns.map((t) => ({ speaker: t.speaker, text: t.text, words: [] }))
        : content;
      return createConversation({
        title,
        content: structuredContent,
        type: isConversation ? "conversation" : "review",
        conversation_timestamp: conversationTs ? new Date(conversationTs).toISOString() : undefined,
        metadata: metadata.filter((m) => m.key.trim()),
        organization_id: organizationId,
        scope_id: scopeId,
        scope_type: "campaign",
      });
    },
    onSuccess: () => {
      invalidate();
      closeCreate();
      setTitle("");
      setContent("");
      setTurns([{ speaker: "Speaker A", text: "" }]);
      setMetadata([]);
      setContentMode("text");
      setConversationTs("");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("No file selected");
      const conv = await createConversation({
        title: uploadTitle || audioFile.name,
        content: [],
        type: "conversation",
        conversation_timestamp: uploadConversationTs
          ? new Date(uploadConversationTs).toISOString()
          : undefined,
        metadata: uploadMetadata.filter((m) => m.key.trim()),
        organization_id: organizationId,
        scope_id: scopeId,
        scope_type: "campaign",
      });
      await uploadAudio(conv.id, audioFile);
    },
    onSuccess: () => {
      invalidate();
      closeUpload();
      setUploadTitle("");
      setUploadConversationTs("");
      setUploadMetadata([]);
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
          <Stack gap={6}>
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500}>
                Content
              </Text>
              <SegmentedControl
                size="xs"
                value={contentMode}
                onChange={(v) => setContentMode(v as "text" | "turns")}
                data={[
                  { label: "Plain text", value: "text" },
                  { label: "Speaker turns", value: "turns" },
                ]}
              />
            </Group>
            {contentMode === "text" ? (
              <Textarea
                placeholder="What's this conversation about?"
                value={content}
                onChange={(e) => setContent(e.currentTarget.value)}
                rows={4}
              />
            ) : (
              <SpeakerTurnsEditor value={turns} onChange={setTurns} />
            )}
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Date &amp; time (UTC)
            </Text>
            <input
              type="datetime-local"
              value={conversationTs}
              onChange={(e) => setConversationTs(e.currentTarget.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ced4da",
                fontSize: 14,
              }}
            />
            <Text size="xs" c="dimmed">
              Leave blank to use current time
            </Text>
          </Stack>
          <MetadataEditor value={metadata} onChange={setMetadata} />
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
      <Modal opened={uploadOpened} onClose={closeUpload} title="Upload audio" centered size="md">
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
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Date &amp; time (UTC)
            </Text>
            <input
              type="datetime-local"
              value={uploadConversationTs}
              onChange={(e) => setUploadConversationTs(e.currentTarget.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ced4da",
                fontSize: 14,
              }}
            />
            <Text size="xs" c="dimmed">
              Leave blank to use current time
            </Text>
          </Stack>
          <MetadataEditor value={uploadMetadata} onChange={setUploadMetadata} />
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
          <Group gap={6}>
            <Text fw={600} size="sm" c="dimmed">
              CONVERSATIONS
            </Text>
            {(["conversation_timestamp", "title", "stats.duration_seconds"] as const).map(
              (field) => {
                const labels: Record<string, string> = {
                  conversation_timestamp: "Date",
                  title: "Title",
                  "stats.duration_seconds": "Duration",
                };
                const active = sortBy === field;
                return (
                  <Button
                    key={field}
                    size="xs"
                    variant={active ? "light" : "subtle"}
                    onClick={() => toggleSort(field)}
                    rightSection={active ? (sortDir === -1 ? "↓" : "↑") : undefined}
                  >
                    {labels[field]}
                  </Button>
                );
              }
            )}
          </Group>
          <Group gap={6}>
            <ActionIcon size="sm" variant="subtle" onClick={toggleFilters} title="Search / filter">
              <IconSearch size={14} />
            </ActionIcon>
            <Button size="xs" variant="light" color="teal" onClick={openUpload}>
              Upload audio
            </Button>
            <Button size="xs" variant="light" onClick={openCreate}>
              New
            </Button>
          </Group>
        </Group>

        <Collapse expanded={filtersOpen}>
          <FilterPanel
            value={draftFilters}
            onChange={setDraftFilters}
            onApply={() => {
              setActiveFilters(draftFilters);
              setPage(1);
            }}
            onClear={() => {
              setDraftFilters([]);
              setActiveFilters([]);
              setPage(1);
            }}
          />
        </Collapse>

        {isLoading && <Loader size="sm" />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.items.length === 0 && (
          <Text size="sm" c="dimmed">
            No conversations found.
          </Text>
        )}

        {data?.items.map((conv) => (
          <ConversationCard
            key={conv.id}
            conv={conv}
            canMutate={canMutate(conv)}
            onEdit={() => openEdit(conv)}
            onDelete={() => deleteMutation.mutate(conv.id)}
            deleteLoading={deleteMutation.isPending && deleteMutation.variables === conv.id}
          />
        ))}

        {data && data.total > PAGE_SIZE && (
          <Group justify="center" mt="xs">
            <Pagination
              total={Math.ceil(data.total / PAGE_SIZE)}
              value={page}
              onChange={setPage}
              size="sm"
            />
          </Group>
        )}
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
  const hasTranscript =
    conv.type === "conversation" && Array.isArray(conv.content) && conv.content.length > 0;
  const isTranscribing = hasAudio && !hasTranscript;

  const ts = new Date(conv.conversation_timestamp);
  const dateStr = ts.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Paper withBorder p="sm" radius="sm">
      <Group align="flex-start" wrap="nowrap" gap="sm">
        {/* Date column */}
        <Stack gap={0} style={{ width: 72, flexShrink: 0, textAlign: "right" }}>
          <Text size="xs" fw={500} c="dimmed">
            {dateStr}
          </Text>
          <Text size="xs" c="dimmed">
            {timeStr}
          </Text>
        </Stack>

        <Divider orientation="vertical" />

        {/* Content */}
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
          {conv.type === "review" && typeof conv.content === "string" && conv.content && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {conv.content}
            </Text>
          )}
          {conv.stats.duration_seconds != null && (
            <Text size="xs" c="dimmed">
              {Math.round(conv.stats.duration_seconds)}s · {conv.stats.word_count} words
            </Text>
          )}
          {conv.metadata.length > 0 && (
            <Group gap={4}>
              {conv.metadata.map((m) => (
                <Badge key={m.key} size="xs" variant="outline" color="gray">
                  {m.key}: {m.value}
                </Badge>
              ))}
            </Group>
          )}
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
