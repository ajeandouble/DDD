import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Button,
  Group,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Badge,
  Text,
  Collapse,
  Code,
  Paper,
  Select,
  Loader,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  updateWebhookEndpoint,
  listDeliveries,
  testTransformer,
  getSubscription,
  upgradeSubscription,
} from "../lib/api";
import type { WebhookEndpoint, Delivery } from "../dto/webhooks";
import { useMyRoles } from "../hooks/useMyRoles";
import { useTranslation } from "react-i18next";

const DEFAULT_SAMPLE_PAYLOAD = JSON.stringify(
  {
    event: "conversation.transcribed",
    conversation_id: "00000000-0000-0000-0000-000000000000",
    org_id: "00000000-0000-0000-0000-000000000002",
    title: "Interview — Matilda",
    conversation_timestamp: "2025-05-16T10:00:00Z",
    scope_type: "campaign",
    scope_id: "00000000-0000-0000-0000-000000000003",
    metadata: [{ key: "interviewer", value: "Alice" }],
    content: [
      {
        speaker: "Speaker A",
        text: "So, what's your favourite book then?",
        words: [
          { word: " So,", start: 0.0, end: 0.76 },
          { word: " what's", start: 0.76, end: 1.16 },
          { word: " your", start: 1.16, end: 1.24 },
          { word: " favourite", start: 1.24, end: 1.54 },
          { word: " book", start: 1.54, end: 1.86 },
          { word: " then?", start: 1.86, end: 2.46 },
        ],
      },
      {
        speaker: "Speaker B",
        text: "It has to be Matilda.",
        words: [
          { word: " It", start: 2.62, end: 2.86 },
          { word: " has", start: 2.86, end: 3.38 },
          { word: " to", start: 3.38, end: 3.56 },
          { word: " be", start: 3.56, end: 4.56 },
          { word: " Matilda.", start: 4.56, end: 5.16 },
        ],
      },
    ],
    stats: { word_count: 11, duration_seconds: 5.16 },
  },
  null,
  2
);

const DEFAULT_TRANSFORMER = `# payload keys: event, conversation_id, org_id, title, conversation_timestamp,
#   scope_type, scope_id, metadata, content (speaker turns), stats
result = {
    "title": payload["title"],
    "text": " ".join(t["text"] for t in payload["content"]),
    "duration": payload["stats"]["duration_seconds"],
}`;

export function WebhooksPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", orgId],
    queryFn: () => getSubscription(orgId!),
    retry: false,
  });

  const { data: myRoles } = useMyRoles(orgId);
  const isAdmin = myRoles?.org === "admin";

  const { data: endpoints, isLoading: epLoading } = useQuery({
    queryKey: ["webhooks", orgId],
    queryFn: () => listWebhookEndpoints(orgId!),
    retry: false,
  });

  const upgradeMutation = useMutation({
    mutationFn: () => upgradeSubscription(orgId!, "pro"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscription", orgId] }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["webhooks", orgId] });

  const deleteMutation = useMutation({
    mutationFn: (epId: string) => deleteWebhookEndpoint(orgId!, epId),
    onSuccess: invalidate,
  });

  if (subLoading || epLoading) return <Loader size="sm" />;

  if (subscription?.tier === "starter") {
    return (
      <Stack gap="lg" align="center" mt="xl">
        <Title order={3}>{t("webhooks.title")}</Title>
        <Text c="dimmed" ta="center" maw={400}>
          {t("webhooks.noAccess")}
        </Text>
        <Button
          onClick={() => upgradeMutation.mutate()}
          loading={upgradeMutation.isPending}
          size="sm"
        >
          {t("billing.upgradeToPro")}
        </Button>
        {upgradeMutation.isError && <Alert color="red">{String(upgradeMutation.error)}</Alert>}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>{t("webhooks.title")}</Title>
        <Group gap="xs">
          {subscription && (
            <Text size="xs" c="dimmed">
              {subscription.tier} plan
            </Text>
          )}
          {isAdmin && (
            <Button size="xs" onClick={openCreate}>
              {t("webhooks.newEndpoint")}
            </Button>
          )}
        </Group>
      </Group>

      {endpoints?.length === 0 && (
        <Text size="sm" c="dimmed">
          {t("webhooks.noEndpoints")}
        </Text>
      )}

      {endpoints?.map((ep) => (
        <EndpointRow
          key={ep.id}
          ep={ep}
          orgId={orgId!}
          onDelete={() => deleteMutation.mutate(ep.id)}
          onUpdate={invalidate}
        />
      ))}

      {isAdmin && (
        <CreateModal
          orgId={orgId!}
          opened={createOpen}
          onClose={closeCreate}
          onCreated={invalidate}
        />
      )}
    </Stack>
  );
}

function EndpointRow({
  ep,
  orgId,
  onDelete,
  onUpdate,
}: {
  ep: WebhookEndpoint;
  orgId: string;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const { t } = useTranslation();
  const [logsOpen, { toggle: toggleLogs }] = useDisclosure(false);
  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const { data: deliveries } = useQuery({
    queryKey: ["deliveries", ep.id],
    queryFn: () => listDeliveries(orgId, ep.id),
    enabled: logsOpen,
    retry: false,
  });

  const toggleMutation = useMutation({
    mutationFn: () => updateWebhookEndpoint(orgId, ep.id, { enabled: !ep.enabled }),
    onSuccess: onUpdate,
  });

  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Text size="sm" fw={500} style={{ wordBreak: "break-all" }}>
              {ep.url}
            </Text>
            <Badge size="xs" color={ep.enabled ? "green" : "gray"} variant="dot">
              {ep.enabled ? t("webhooks.active") : t("webhooks.disabled")}
            </Badge>
            {ep.event_types.map((et) => (
              <Badge key={et} size="xs" variant="outline">
                {et}
              </Badge>
            ))}
          </Group>
          <Text size="xs" c="dimmed">
            {new Date(ep.created_at).toLocaleString()}
          </Text>
        </Stack>
        <Group gap={4} wrap="nowrap">
          <Button size="xs" variant="subtle" onClick={toggleLogs}>
            {logsOpen ? t("webhooks.hideLogs") : t("webhooks.logs")}
          </Button>
          <Button size="xs" variant="subtle" onClick={openEdit}>
            {t("webhooks.editBtn")}
          </Button>
          <Switch size="xs" checked={ep.enabled} onChange={() => toggleMutation.mutate()} />
          <Button size="xs" variant="subtle" color="red" onClick={onDelete}>
            {t("webhooks.deleteBtn")}
          </Button>
        </Group>
      </Group>

      <Collapse expanded={logsOpen}>
        <Stack gap="xs" mt="sm">
          {!deliveries && <Loader size="xs" />}
          {deliveries?.length === 0 && (
            <Text size="xs" c="dimmed">
              {t("webhooks.noDeliveries")}
            </Text>
          )}
          {deliveries?.map((d) => (
            <DeliveryRow key={d.id} d={d} />
          ))}
        </Stack>
      </Collapse>

      <EditModal orgId={orgId} ep={ep} opened={editOpen} onClose={closeEdit} onSaved={onUpdate} />
    </Paper>
  );
}

function DeliveryRow({ d }: { d: Delivery }) {
  const [open, { toggle }] = useDisclosure(false);
  const color = d.status === "success" ? "green" : "red";

  return (
    <Stack gap={2}>
      <Group gap="xs" style={{ cursor: "pointer" }} onClick={toggle}>
        <Badge size="xs" color={color}>
          {d.status}
        </Badge>
        {d.response_code && (
          <Text size="xs" c="dimmed">
            HTTP {d.response_code}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {new Date(d.created_at).toLocaleString()}
        </Text>
      </Group>
      <Collapse expanded={open}>
        {d.error && (
          <Code block mt={4} style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
            {d.error}
          </Code>
        )}
        {Object.keys(d.payload_sent).length > 0 && (
          <Code block mt={4} style={{ fontSize: 11 }}>
            {JSON.stringify(d.payload_sent, null, 2)}
          </Code>
        )}
      </Collapse>
    </Stack>
  );
}

function TransformerSection({
  transformer,
  onTransformerChange,
}: {
  transformer: string;
  onTransformerChange: (v: string) => void;
}) {
  const [sampleRaw, setSampleRaw] = useState(DEFAULT_SAMPLE_PAYLOAD);
  const [testResult, setTestResult] = useState<{
    result: unknown;
    error: string | null;
    stdout: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const runTest = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(sampleRaw);
      setPayloadError(null);
    } catch (e) {
      setPayloadError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    setTesting(true);
    try {
      const r = await testTransformer(transformer, parsed);
      setTestResult(r);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        Transformer
      </Text>
      <Text size="xs" c="dimmed">
        Receives <Code>payload</Code> dict. Assign a dict to <Code>result</Code>.
      </Text>
      <Textarea
        value={transformer}
        onChange={(e) => onTransformerChange(e.currentTarget.value)}
        rows={8}
        styles={{ input: { fontFamily: "monospace", fontSize: 13 } }}
      />
      <Text size="sm" fw={500} mt={4}>
        Sample payload
      </Text>
      <Textarea
        value={sampleRaw}
        onChange={(e) => {
          setSampleRaw(e.currentTarget.value);
          setPayloadError(null);
        }}
        rows={6}
        error={payloadError}
        styles={{ input: { fontFamily: "monospace", fontSize: 11 } }}
      />
      <Group justify="flex-end">
        <Button size="xs" variant="light" loading={testing} onClick={runTest}>
          Test
        </Button>
      </Group>
      {testResult && (
        <Stack gap={4}>
          {testResult.stdout && (
            <Code block style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
              {testResult.stdout}
            </Code>
          )}
          {testResult.error ? (
            <Code
              block
              style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "var(--mantine-color-red-6)" }}
            >
              {testResult.error}
            </Code>
          ) : (
            <Code block style={{ fontSize: 11 }}>
              {JSON.stringify(testResult.result, null, 2)}
            </Code>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function CreateModal({
  orgId,
  opened,
  onClose,
  onCreated,
}: {
  orgId: string;
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [transformer, setTransformer] = useState(DEFAULT_TRANSFORMER);

  const mutation = useMutation({
    mutationFn: () =>
      createWebhookEndpoint(orgId, {
        url,
        secret,
        event_types: ["conversation.transcribed"],
        transformer,
        enabled: true,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      setUrl("");
      setSecret("");
      setTransformer(DEFAULT_TRANSFORMER);
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title={t("webhooks.newTitle")} size="lg" centered>
      <Stack>
        <TextInput
          label={t("webhooks.urlLabel")}
          placeholder={t("webhooks.urlPlaceholder")}
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
        />
        <TextInput
          label={t("webhooks.secretLabel")}
          placeholder="optional"
          value={secret}
          onChange={(e) => setSecret(e.currentTarget.value)}
        />
        <Select
          label="Event"
          data={[{ value: "conversation.transcribed", label: "conversation.transcribed" }]}
          value="conversation.transcribed"
          readOnly
        />
        <TransformerSection transformer={transformer} onTransformerChange={setTransformer} />
        {mutation.isError && <Alert color="red">{String(mutation.error)}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!url}>
            {t("webhooks.createBtn")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EditModal({
  orgId,
  ep,
  opened,
  onClose,
  onSaved,
}: {
  orgId: string;
  ep: WebhookEndpoint;
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(ep.url);
  const [secret, setSecret] = useState(ep.secret);
  const [transformer, setTransformer] = useState(ep.transformer);

  const mutation = useMutation({
    mutationFn: () => updateWebhookEndpoint(orgId, ep.id, { url, secret, transformer }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title={t("webhooks.editTitle")} size="lg" centered>
      <Stack>
        <TextInput
          label={t("webhooks.urlLabel")}
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
        />
        <TextInput
          label={t("webhooks.secretLabel")}
          value={secret}
          onChange={(e) => setSecret(e.currentTarget.value)}
        />
        <TransformerSection transformer={transformer} onTransformerChange={setTransformer} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {t("webhooks.saveBtn")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
