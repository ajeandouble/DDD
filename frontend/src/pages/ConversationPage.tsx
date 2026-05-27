import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Button,
  Modal,
  TextInput,
  MultiSelect,
  Pill,
  PillGroup,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft, IconEdit, IconTrash } from "@tabler/icons-react";
import {
  getConversation,
  getImportJobs,
  updateConversation,
  deleteConversation,
  listTags,
  createTag,
} from "../lib/api";
import { AudioTranscriptPlayer } from "../components/AudioTranscriptPlayer";
import type { SpeakerTurn } from "../dto/conversations";
import { useTranslation } from "react-i18next";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ConversationPage() {
  const { convId } = useParams<{ convId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { t } = useTranslation();
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");

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

  const orgId = conv?.organization_id ?? null;

  const { data: tags } = useQuery({
    queryKey: ["tags", orgId],
    queryFn: () => listTags(orgId!),
    enabled: !!orgId,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: () => updateConversation(convId!, { title: editTitle, tag_ids: editTagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", convId] });
      closeEdit();
    },
  });

  const createTagMutation = useMutation({
    mutationFn: () => createTag(orgId!, newTagName.trim()),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ["tags", orgId] });
      setEditTagIds((ids) => [...ids, tag.id]);
      setNewTagName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteConversation(convId!),
    onSuccess: () => {
      navigate(-1);
    },
  });

  const openEditModal = () => {
    if (!conv) return;
    setEditTitle(conv.title);
    setEditTagIds(conv.tag_ids);
    openEdit();
  };

  if (isLoading) return <Loader size="sm" />;
  if (!conv) return <Alert color="red">Conversation not found</Alert>;

  const storageKey = importJobs?.find((j) => j.storage_key)?.storage_key ?? null;
  const audioUrl = storageKey ? `/api/storage/${storageKey}` : null;
  const turns =
    conv.type === "conversation" && Array.isArray(conv.content) && conv.content.length > 0
      ? (conv.content as SpeakerTurn[])
      : null;
  const isTranscribing = !!storageKey && conv.type === "conversation" && !turns;

  const tagOptions = (tags ?? []).map((t) => ({ value: t.id, label: t.name }));
  const tagMap = Object.fromEntries((tags ?? []).map((t) => [t.id, t.name]));
  const convTagNames = conv.tag_ids.map((id) => tagMap[id]).filter(Boolean);

  return (
    <>
      {/* Edit modal */}
      <Modal
        opened={editOpened}
        onClose={closeEdit}
        title={t("conversation.editTitle")}
        centered
        size="md"
      >
        <Stack>
          <TextInput
            label={t("conversations.titleLabel")}
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
            data-autofocus
          />
          <MultiSelect
            label={t("conversations.tagsLabel")}
            data={tagOptions}
            value={editTagIds}
            onChange={setEditTagIds}
            placeholder={t("conversations.selectTagsPlaceholder")}
            searchable
            clearable
          />
          <Group gap={6} align="flex-end">
            <TextInput
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.currentTarget.value)}
              style={{ flex: 1 }}
              size="xs"
              onKeyDown={(e) =>
                e.key === "Enter" && newTagName.trim() && createTagMutation.mutate()
              }
            />
            <Button
              size="xs"
              variant="light"
              onClick={() => createTagMutation.mutate()}
              disabled={!newTagName.trim()}
              loading={createTagMutation.isPending}
            >
              {t("conversations.addTagLabel")}
            </Button>
          </Group>
          {updateMutation.isError && (
            <Text size="sm" c="red">
              {String(updateMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeEdit}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
              {t("common.save")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        opened={deleteOpened}
        onClose={closeDelete}
        title={t("conversation.deleteTitle")}
        centered
        size="sm"
      >
        <Stack>
          <Text
            size="sm"
            dangerouslySetInnerHTML={{
              __html: t("conversation.deleteConfirm", { title: `<strong>${conv.title}</strong>` }),
            }}
          />
          {deleteMutation.isError && (
            <Text size="sm" c="red">
              {String(deleteMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>
              {t("common.cancel")}
            </Button>
            <Button
              color="red"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
            >
              {t("common.delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="md">
        <Group gap="xs">
          <Tooltip label={t("conversation.backTooltip")}>
            <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
              <IconArrowLeft size={18} />
            </ActionIcon>
          </Tooltip>
          <Title order={3} style={{ flex: 1 }}>
            {conv.title}
          </Title>
          <Tooltip label={t("conversation.editTooltip")}>
            <ActionIcon variant="subtle" onClick={openEditModal}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("conversation.deleteTooltip")}>
            <ActionIcon variant="subtle" color="red" onClick={openDelete}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap="xs" wrap="wrap">
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
              {t("conversations.wordCount", { count: conv.stats.word_count })}
            </Badge>
          )}
          {isTranscribing && (
            <Badge size="xs" color="yellow" variant="dot">
              {t("conversations.transcribing")}
            </Badge>
          )}
        </Group>

        {convTagNames.length > 0 && (
          <PillGroup>
            {convTagNames.map((name) => (
              <Pill key={name} size="xs">
                {name}
              </Pill>
            ))}
          </PillGroup>
        )}

        {turns && audioUrl ? (
          <AudioTranscriptPlayer
            audioUrl={audioUrl}
            turns={turns}
            duration={conv.stats.duration_seconds ?? 0}
          />
        ) : turns ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed" fw={600}>
              {t("conversations.transcriptTitle")}
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
            {t("conversation.pendingTranscript")}
          </Text>
        ) : typeof conv.content === "string" && conv.content ? (
          <Paper withBorder p="md" radius="sm">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {conv.content}
            </Text>
          </Paper>
        ) : (
          <Text size="sm" c="dimmed">
            {t("conversation.noContent")}
          </Text>
        )}
      </Stack>
    </>
  );
}
