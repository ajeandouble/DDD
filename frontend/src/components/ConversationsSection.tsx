import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  getConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  getMe,
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
  const [editConv, setEditConv] = useState<ConversationResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations", ...queryKey],
    queryFn: () =>
      getConversations(
        scopeId && scopeType
          ? { scope_id: scopeId, scope_type: scopeType }
          : { organization_id: organizationId }
      ),
    retry: false,
  });

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
    setEditContent(conv.content);
  };

  const canMutate = (conv: ConversationResponse) => me?.id === conv.created_by;

  return (
    <>
      {/* Create modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="New conversation" centered size="lg">
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
            <Text size="sm" c="red">{String(createMutation.error)}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create
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
            <Text size="sm" c="red">{String(updateMutation.error)}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditConv(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600} size="sm" c="dimmed">CONVERSATIONS</Text>
          <Button size="xs" variant="light" onClick={openCreate}>New</Button>
        </Group>

        {isLoading && <Loader size="sm" />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && <Text size="sm" c="dimmed">No conversations yet.</Text>}

        {data?.map((conv) => (
          <Paper key={conv.id} withBorder p="sm" radius="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={500} size="sm">{conv.title}</Text>
                {conv.content && (
                  <Text size="xs" c="dimmed" lineClamp={2}>{conv.content}</Text>
                )}
                <Group gap={4} mt={4}>
                  <Text size="xs" c="dimmed">{new Date(conv.timestamp).toLocaleDateString()}</Text>
                  {conv.tag_ids.length > 0 && (
                    <Badge size="xs" variant="dot" color="blue">
                      {conv.tag_ids.length} tag{conv.tag_ids.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </Group>
              </Stack>

              {canMutate(conv) && (
                <Group gap={4} wrap="nowrap">
                  <Button size="xs" variant="subtle" onClick={() => openEdit(conv)}>
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    loading={deleteMutation.isPending && deleteMutation.variables === conv.id}
                    onClick={() => deleteMutation.mutate(conv.id)}
                  >
                    Delete
                  </Button>
                </Group>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
      <Divider mt="xl" />
    </>
  );
}
