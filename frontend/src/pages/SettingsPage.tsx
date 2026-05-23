import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES } from "../i18n";
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
  ActionIcon,
  Avatar,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import imageCompression from "browser-image-compression";
import {
  listApiKeys,
  createApiKey,
  deleteApiKey,
  getOrganizations,
  getProjects,
  getSubprojects,
  getCampaigns,
  getMyRoles,
  getMe,
  updatePreferences,
  uploadAvatar,
  deleteAvatar,
  avatarUrl,
  listTags,
  createTag,
  deleteTag,
} from "../lib/api";
import type { ApiKeyCreated } from "../dto/iam";
import { canManageMembers, canWrite, getEffectiveRole } from "../dto/permissions";

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
  const { t, i18n } = useTranslation();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  const localeMutation = useMutation({
    mutationFn: (locale: string) => updatePreferences(locale),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      i18n.changeLanguage(user.locale);
    },
  });

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

  const [tagOrgId, setTagOrgId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  const { data: tags } = useQuery({
    queryKey: ["tags", tagOrgId],
    queryFn: () => listTags(tagOrgId!),
    enabled: !!tagOrgId,
  });

  const { data: tagOrgRoles } = useQuery({
    queryKey: ["my-roles", tagOrgId],
    queryFn: () => getMyRoles(tagOrgId!),
    enabled: !!tagOrgId,
  });
  const tagOrgRole = tagOrgId ? getEffectiveRole("org", tagOrgId, tagOrgRoles) : null;

  const [avatarUploading, setAvatarUploading] = useState(false);

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      notifications.show({ color: "green", message: t("settings.avatarUpdated") });
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const handleAvatarDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setAvatarUploading(true);
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 256,
          useWebWorker: true,
        });
        if (compressed.size > 400 * 1024) {
          notifications.show({ color: "red", message: t("settings.avatarTooLarge") });
          return;
        }
        await avatarMutation.mutateAsync(
          new File([compressed], file.name, { type: compressed.type })
        );
      } finally {
        setAvatarUploading(false);
      }
    },
    [avatarMutation, t]
  );

  const createTagMutation = useMutation({
    mutationFn: () => createTag(tagOrgId!, newTagName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags", tagOrgId] });
      setNewTagName("");
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) => deleteTag(tagOrgId!, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags", tagOrgId] }),
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
      <Title order={2}>{t("settings.title")}</Title>

      <Stack gap="xs">
        <Text fw={600} size="lg">
          {t("settings.avatar")}
        </Text>
        <Text size="sm" c="dimmed">
          {t("settings.avatarDesc")}
        </Text>
        <Group align="flex-start" gap="md">
          <Avatar
            src={me?.has_avatar ? avatarUrl(me.id) : undefined}
            size={80}
            radius="xl"
            color="blue"
          >
            {me?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Stack gap="xs" style={{ flex: 1 }}>
            <Dropzone
              onDrop={handleAvatarDrop}
              accept={IMAGE_MIME_TYPE}
              maxSize={5 * 1024 * 1024}
              loading={avatarUploading}
              styles={{ root: { padding: "12px 16px" } }}
            >
              <Text size="sm" c="dimmed" ta="center">
                {t("settings.avatarDesc")}
              </Text>
            </Dropzone>
            {me?.has_avatar && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                loading={deleteAvatarMutation.isPending}
                onClick={() => deleteAvatarMutation.mutate()}
              >
                {t("settings.avatarRemove")}
              </Button>
            )}
          </Stack>
        </Group>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text fw={600} size="lg">
          {t("settings.language")}
        </Text>
        <Text size="sm" c="dimmed">
          {t("settings.languageDesc")}
        </Text>
        <Select
          style={{ width: 200 }}
          data={SUPPORTED_LOCALES}
          value={me?.locale ?? i18n.language}
          onChange={(v) => v && localeMutation.mutate(v)}
        />
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Group justify="space-between">
          <div>
            <Text fw={600} size="lg">
              {t("settings.apiKeys")}
            </Text>
            <Text size="sm" c="dimmed">
              {t("settings.apiKeysDesc")}
            </Text>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            disabled={!canCreateKey}
            title={!canCreateKey ? t("settings.requiresSupervisor") : undefined}
          >
            {t("settings.newKey")}
          </Button>
        </Group>

        {isLoading && (
          <Text size="sm" c="dimmed">
            {t("settings.keyLoading")}
          </Text>
        )}
        {keys?.length === 0 && (
          <Text size="sm" c="dimmed">
            {t("settings.noKeys")}
          </Text>
        )}
        {keys && keys.length > 0 && (
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("settings.table.name")}</Table.Th>
                <Table.Th>{t("settings.table.prefix")}</Table.Th>
                <Table.Th>{t("settings.table.scope")}</Table.Th>
                <Table.Th>{t("settings.table.created")}</Table.Th>
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
                        {t("settings.unrestricted")}
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
                      {t("common.delete")}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Divider />

      <Stack gap="sm">
        <div>
          <Text fw={600} size="lg">
            {t("settings.tags")}
          </Text>
          <Text size="sm" c="dimmed">
            {t("settings.tagsDesc")}
          </Text>
        </div>
        <Select
          style={{ width: 260 }}
          placeholder={t("settings.selectOrgForTags")}
          data={orgs?.map((o) => ({ value: o.id, label: o.name })) ?? []}
          value={tagOrgId}
          onChange={setTagOrgId}
        />
        {tagOrgId && (
          <Stack gap="xs">
            {tags?.length === 0 && (
              <Text size="sm" c="dimmed">
                {t("settings.noTags")}
              </Text>
            )}
            {tags && tags.length > 0 && (
              <Group gap="xs" wrap="wrap">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="light"
                    rightSection={
                      canManageMembers(tagOrgRole) ? (
                        <ActionIcon
                          size="xs"
                          color="gray"
                          variant="transparent"
                          onClick={() => deleteTagMutation.mutate(tag.id)}
                          aria-label={t("common.delete")}
                        >
                          ×
                        </ActionIcon>
                      ) : undefined
                    }
                  >
                    {tag.name}
                  </Badge>
                ))}
              </Group>
            )}
            {canWrite(tagOrgRole) && (
              <Group gap="xs">
                <TextInput
                  placeholder={t("settings.newTagPlaceholder")}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagName.trim()) createTagMutation.mutate();
                  }}
                  size="sm"
                />
                <Button
                  size="sm"
                  loading={createTagMutation.isPending}
                  disabled={!newTagName.trim()}
                  onClick={() => createTagMutation.mutate()}
                >
                  {t("settings.addTag")}
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Stack>

      {/* Create modal */}
      <Modal
        opened={createOpened}
        onClose={() => {
          closeCreate();
          resetForm();
        }}
        title={t("settings.newKeyModal")}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label={t("common.name")}
            placeholder="My integration key"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <Divider label={t("settings.scopeRestriction")} labelPosition="left" />
          <Select
            label={t("settings.scopeType")}
            placeholder={t("settings.scopeTypePlaceholder")}
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
              label={t("orgs.title")}
              placeholder={t("settings.selectOrg")}
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
                label={t("projects.title")}
                placeholder={t("settings.selectProject")}
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
              label={t("subprojects.title")}
              placeholder={t("settings.selectSubproject")}
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
              label={t("scopeTypes.campaign")}
              placeholder={t("settings.selectCampaign")}
              data={campaigns?.map((c) => ({ value: c.id, label: c.name })) ?? []}
              value={selectedCampaignId}
              onChange={setSelectedCampaignId}
              required
            />
          )}
          {scopeType && (
            <Select
              label={t("settings.roleAtScope")}
              placeholder={t("settings.selectRole")}
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
            {t("settings.generateKey")}
          </Button>
        </Stack>
      </Modal>

      {/* Revealed key modal */}
      <Modal
        opened={!!revealedKey}
        onClose={() => setRevealedKey(null)}
        title={t("settings.keyCreatedTitle")}
        size="md"
      >
        <Stack gap="sm">
          <Alert color="yellow" title={t("settings.saveKeyNow")}>
            {t("settings.saveKeyDesc")}
          </Alert>
          <Code block style={{ wordBreak: "break-all", fontSize: 13 }}>
            {revealedKey?.raw_key}
          </Code>
          <CopyButton value={revealedKey?.raw_key ?? ""} timeout={2000}>
            {({ copied, copy }) => (
              <Button color={copied ? "teal" : "blue"} onClick={copy}>
                {copied ? t("settings.copied") : t("settings.copyToClipboard")}
              </Button>
            )}
          </CopyButton>
          <Text size="xs" c="dimmed">
            {t("settings.keyUsageHint")}
          </Text>
        </Stack>
      </Modal>
    </Stack>
  );
}
