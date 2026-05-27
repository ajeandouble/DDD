import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Group,
  Button,
  Modal,
  TextInput,
  SimpleGrid,
  Text,
  Stack,
  Loader,
  Alert,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  getOrganization,
  getProject,
  getSubproject,
  getCampaigns,
  createCampaign,
  updateSubprojectSettings,
  renameSubproject,
} from "../lib/api";
import { MembersDrawer } from "../components/MembersDrawer";
import { ScopeCard } from "../components/ScopeCard";
import { ScopeSettingsModal } from "../components/ScopeSettingsModal";
import { EditableTitle } from "../components/EditableTitle";
import { useCanManageMembers } from "../hooks/useMyRoles";
import { useTranslation } from "react-i18next";
import type { Subproject } from "../dto/scopes";

export function SubprojectPage() {
  const { orgId, projectId, subprojectId } = useParams<{
    orgId: string;
    projectId: string;
    subprojectId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const canManageMembersOnScope = useCanManageMembers(orgId, "subproject", subprojectId);
  const { t } = useTranslation();
  const [name, setName] = useState("");

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getOrganization(orgId!),
    retry: false,
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    retry: false,
  });

  const { data: subproject } = useQuery({
    queryKey: ["subproject", subprojectId],
    queryFn: () => getSubproject(subprojectId!),
    retry: false,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", subprojectId],
    queryFn: () => getCampaigns(subprojectId!),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => createCampaign(subprojectId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", subprojectId] });
      close();
      setName("");
    },
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameSubproject(subprojectId!, name),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ["subproject", subprojectId] });
      const previous = queryClient.getQueryData(["subproject", subprojectId]);
      queryClient.setQueryData(["subproject", subprojectId], (old: Subproject) =>
        old ? { ...old, name } : old
      );
      return { previous };
    },
    onError: (_err, _name, ctx) => {
      queryClient.setQueryData(["subproject", subprojectId], ctx?.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["subproject", subprojectId], updated);
      queryClient.invalidateQueries({ queryKey: ["subprojects", projectId] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (color: string | null) => updateSubprojectSettings(subprojectId!, { color }),
    onMutate: async (color) => {
      await queryClient.cancelQueries({ queryKey: ["subproject", subprojectId] });
      const previous = queryClient.getQueryData(["subproject", subprojectId]);
      queryClient.setQueryData(["subproject", subprojectId], (old: Subproject) =>
        old ? { ...old, color } : old
      );
      return { previous };
    },
    onError: (_err, _color, ctx) => {
      queryClient.setQueryData(["subproject", subprojectId], ctx?.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subprojects", projectId] });
      closeSettings();
    },
  });

  const color = subproject?.color;

  return (
    <>
      <Modal opened={opened} onClose={close} title={t("campaigns.modalTitle")} centered>
        <Stack>
          <TextInput
            label={t("common.name")}
            placeholder={t("campaigns.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && createMutation.mutate()}
            data-autofocus
          />
          {createMutation.isError && (
            <Text size="sm" c="red">
              {String(createMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              {t("common.create")}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <ScopeSettingsModal
        opened={settingsOpened}
        onClose={closeSettings}
        currentColor={subproject?.color}
        onSave={(color) => settingsMutation.mutate(color)}
        isPending={settingsMutation.isPending}
        error={settingsMutation.error}
      />
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} to="/orgs" size="sm">
            {t("orgs.title")}
          </Anchor>
          <Anchor component={Link} to={`/orgs/${orgId}`} size="sm">
            {org?.name ?? orgId}
          </Anchor>
          <Anchor component={Link} to={`/orgs/${orgId}/projects/${projectId}`} size="sm">
            {project?.name ?? projectId}
          </Anchor>
          <Text size="sm">{subproject?.name ?? subprojectId}</Text>
        </Breadcrumbs>

        <Group
          justify="space-between"
          style={
            color
              ? {
                  borderLeft: `4px solid ${color}`,
                  paddingLeft: 12,
                  background: `${color}12`,
                  borderRadius: 4,
                }
              : undefined
          }
        >
          <EditableTitle
            value={subproject?.name ?? ""}
            order={2}
            canEdit={canManageMembersOnScope}
            onSave={(name) => renameMutation.mutateAsync(name).then(() => {})}
          />
          <Group gap={6}>
            {canManageMembersOnScope && (
              <Button size="xs" variant="light" onClick={openSettings}>
                {t("scopes.settings")}
              </Button>
            )}
            {canManageMembersOnScope && (
              <Button size="xs" variant="light" onClick={openMembers}>
                {t("scopes.members")}
              </Button>
            )}
          </Group>
        </Group>

        <MembersDrawer
          showGroups
          orgId={orgId!}
          scopeType="subproject"
          scopeId={subprojectId!}
          opened={membersOpened}
          onClose={closeMembers}
        />

        <Group justify="space-between" mt="sm">
          <Text fw={600}>{t("projects.campaigns")}</Text>
          <Button size="xs" onClick={open}>
            {t("campaigns.new")}
          </Button>
        </Group>

        {isLoading && <Loader />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && (
          <Text c="dimmed" size="sm">
            {t("campaigns.noCampaigns")}
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {data?.map((campaign) => (
            <ScopeCard
              key={campaign.id}
              name={campaign.name}
              color={campaign.color}
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
