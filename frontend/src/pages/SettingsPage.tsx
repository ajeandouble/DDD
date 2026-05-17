import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Badge,
  Modal,
  Code,
  CopyButton,
  Divider,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  listApiKeys,
  createApiKey,
  deleteApiKey,
  getOrganizations,
  getProjects,
  getSubprojects,
  getCampaigns,
  getMyRoles,
} from "../lib/api";
import type { ApiKeyCreated } from "../dto/iam";
import { canManageMembers, getEffectiveRole } from "../dto/permissions";

const SCOPE_TYPES = [
  { value: "org", label: "Organization" },
  { value: "project", label: "Project" },
  { value: "subproject", label: "Subproject" },
  { value: "campaign", label: "Campaign" },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);

  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const { data: orgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });

  // Check supervisor+ in at least one org
  const firstOrgId = orgs?.[0]?.id;
  const { data: myRoles } = useQuery({
    queryKey: ["my-roles", firstOrgId],
    queryFn: () => getMyRoles(firstOrgId!),
    enabled: !!firstOrgId,
  });
  const canCreateKey =
    myRoles != null &&
    (orgs ?? []).some((o) => canManageMembers(getEffectiveRole("org", o.id, myRoles)));

  const { data: projects } = useQuery({
    queryKey: ["projects", selectedOrgId],
    queryFn: () => getProjects(selectedOrgId!),
    enabled:
      createOpened &&
      !!selectedOrgId &&
      (scopeType === "project" || scopeType === "subproject" || scopeType === "campaign"),
  });

  const { data: subprojects } = useQuery({
    queryKey: ["subprojects", selectedProjectId],
    queryFn: () => getSubprojects(selectedProjectId!),
    enabled:
      createOpened &&
      !!selectedProjectId &&
      (scopeType === "subproject" || scopeType === "campaign"),
  });

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", selectedSubprojectId],
    queryFn: () => getCampaigns(selectedSubprojectId!),
    enabled: createOpened && !!selectedSubprojectId && scopeType === "campaign",
  });

  const scopeId = (): string | undefined => {
    switch (scopeType) {
      case "org":
        return selectedOrgId ?? undefined;
      case "project":
        return selectedProjectId ?? undefined;
      case "subproject":
        return selectedSubprojectId ?? undefined;
      case "campaign":
        return selectedCampaignId ?? undefined;
      default:
        return undefined;
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createApiKey({
        name,
        scope_type: scopeType ?? undefined,
        scope_id: scopeId(),
        role: role ?? undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setRevealedKey(data);
      closeCreate();
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  function resetForm() {
    setName("");
    setScopeType(null);
    setSelectedOrgId(null);
    setSelectedProjectId(null);
    setSelectedSubprojectId(null);
    setSelectedCampaignId(null);
    setRole(null);
  }

  return (
    <Stack gap="lg" maw={800}>
      <Title order={2}>Settings</Title>

      <Stack gap="sm">
        <Group justify="space-between">
          <div>
            <Text fw={600} size="lg">
              API Keys
            </Text>
            <Text size="sm" c="dimmed">
              Keys let you authenticate API requests without a user session. Visible to supervisors
              and admins.
            </Text>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            disabled={!canCreateKey}
            title={!canCreateKey ? "Requires supervisor or admin role" : undefined}
          >
            New key
          </Button>
        </Group>

        {isLoading && (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        )}
        {keys?.length === 0 && (
          <Text size="sm" c="dimmed">
            No API keys yet.
          </Text>
        )}
        {keys && keys.length > 0 && (
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Prefix</Table.Th>
                <Table.Th>Scope</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {keys.map((k) => (
                <Table.Tr key={k.id}>
                  <Table.Td>{k.name}</Table.Td>
                  <Table.Td>
                    <Code>ddd_{k.key_prefix}…</Code>
                  </Table.Td>
                  <Table.Td>
                    {k.scope_type ? (
                      <Badge size="sm" variant="light">
                        {k.scope_type}:{k.scope_id?.slice(0, 8)}…
                      </Badge>
                    ) : (
                      <Text size="xs" c="dimmed">
                        Unrestricted
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(k.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      color="red"
                      variant="subtle"
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(k.id)}
                    >
                      Delete
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      {/* Create modal */}
      <Modal
        opened={createOpened}
        onClose={() => {
          closeCreate();
          resetForm();
        }}
        title="New API Key"
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="My integration key"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <Divider label="Scope restriction (optional)" labelPosition="left" />
          <Select
            label="Scope type"
            placeholder="Unrestricted (all scopes)"
            data={SCOPE_TYPES}
            value={scopeType}
            onChange={(v) => {
              setScopeType(v);
              setSelectedOrgId(null);
              setSelectedProjectId(null);
              setSelectedSubprojectId(null);
              setSelectedCampaignId(null);
            }}
            clearable
          />
          {scopeType && (
            <Select
              label="Organization"
              placeholder="Select org"
              data={orgs?.map((o) => ({ value: o.id, label: o.name })) ?? []}
              value={selectedOrgId}
              onChange={(v) => {
                setSelectedOrgId(v);
                setSelectedProjectId(null);
                setSelectedSubprojectId(null);
                setSelectedCampaignId(null);
              }}
              required
            />
          )}
          {(scopeType === "project" || scopeType === "subproject" || scopeType === "campaign") &&
            selectedOrgId && (
              <Select
                label="Project"
                placeholder="Select project"
                data={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
                value={selectedProjectId}
                onChange={(v) => {
                  setSelectedProjectId(v);
                  setSelectedSubprojectId(null);
                  setSelectedCampaignId(null);
                }}
                required
              />
            )}
          {(scopeType === "subproject" || scopeType === "campaign") && selectedProjectId && (
            <Select
              label="Subproject"
              placeholder="Select subproject"
              data={subprojects?.map((s) => ({ value: s.id, label: s.name })) ?? []}
              value={selectedSubprojectId}
              onChange={(v) => {
                setSelectedSubprojectId(v);
                setSelectedCampaignId(null);
              }}
              required
            />
          )}
          {scopeType === "campaign" && selectedSubprojectId && (
            <Select
              label="Campaign"
              placeholder="Select campaign"
              data={campaigns?.map((c) => ({ value: c.id, label: c.name })) ?? []}
              value={selectedCampaignId}
              onChange={setSelectedCampaignId}
              required
            />
          )}
          {scopeType && (
            <Select
              label="Role at this scope"
              placeholder="Select role"
              data={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
            />
          )}
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name}
            mt="xs"
          >
            Generate key
          </Button>
        </Stack>
      </Modal>

      {/* Revealed key modal */}
      <Modal
        opened={!!revealedKey}
        onClose={() => setRevealedKey(null)}
        title="API Key Created"
        size="md"
      >
        <Stack gap="sm">
          <Alert color="yellow" title="Save this key now">
            This is the only time the full key will be shown. It cannot be recovered.
          </Alert>
          <Code block style={{ wordBreak: "break-all", fontSize: 13 }}>
            {revealedKey?.raw_key}
          </Code>
          <CopyButton value={revealedKey?.raw_key ?? ""} timeout={2000}>
            {({ copied, copy }) => (
              <Button color={copied ? "teal" : "blue"} onClick={copy}>
                {copied ? "Copied!" : "Copy to clipboard"}
              </Button>
            )}
          </CopyButton>
          <Text size="xs" c="dimmed">
            Use this key in the <Code>Authorization: Bearer &lt;key&gt;</Code> header.
          </Text>
        </Stack>
      </Modal>
    </Stack>
  );
}
