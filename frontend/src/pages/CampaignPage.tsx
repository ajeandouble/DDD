import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, Breadcrumbs, Anchor, Text, Group, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  getCampaign,
  getOrganization,
  getProject,
  getSubproject,
  updateCampaignSettings,
  renameCampaign,
} from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";
import { MembersDrawer } from "../components/MembersDrawer";
import { ScopeSettingsModal } from "../components/ScopeSettingsModal";
import { EditableTitle } from "../components/EditableTitle";
import { useCanManageMembers, useMyRoles } from "../hooks/useMyRoles";
import { getEffectiveRole, canManageMembers } from "../dto/permissions";
import { useTranslation } from "react-i18next";
import type { Campaign } from "../dto/scopes";

export function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const queryClient = useQueryClient();
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => getCampaign(campaignId!),
    enabled: !!campaignId,
  });

  const orgId = campaign?.organization_id;

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getOrganization(orgId!),
    enabled: !!orgId,
  });

  const { data: project } = useQuery({
    queryKey: ["project", campaign?.parent_id],
    queryFn: () => getProject(campaign!.parent_id),
    enabled: campaign?.parent_type === "project",
  });

  const { data: subproject } = useQuery({
    queryKey: ["subproject", campaign?.parent_id],
    queryFn: () => getSubproject(campaign!.parent_id),
    enabled: campaign?.parent_type === "subproject",
  });

  const { data: subprojectProject } = useQuery({
    queryKey: ["project", subproject?.project_id],
    queryFn: () => getProject(subproject!.project_id),
    enabled: !!subproject,
  });

  const { t } = useTranslation();
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const canManageMembersOnScope = useCanManageMembers(orgId, "campaign", campaignId);

  const { data: myRoles } = useMyRoles(orgId);
  const scopeRole = myRoles ? getEffectiveRole("campaign", campaignId!, myRoles) : null;
  const canSettings = canManageMembers(scopeRole);

  function invalidateCampaignLists() {
    queryClient.invalidateQueries({ queryKey: ["campaigns", campaign?.parent_id] });
    queryClient.invalidateQueries({ queryKey: ["campaigns-by-project", campaign?.parent_id] });
    queryClient.invalidateQueries({ queryKey: ["campaigns-by-org", orgId] });
  }

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameCampaign(campaignId!, name),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ["campaign", campaignId] });
      const previous = queryClient.getQueryData(["campaign", campaignId]);
      queryClient.setQueryData(["campaign", campaignId], (old: Campaign) =>
        old ? { ...old, name } : old
      );
      return { previous };
    },
    onError: (_err, _name, ctx) => {
      queryClient.setQueryData(["campaign", campaignId], ctx?.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["campaign", campaignId], updated);
      invalidateCampaignLists();
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (color: string | null) => updateCampaignSettings(campaignId!, { color }),
    onMutate: async (color) => {
      await queryClient.cancelQueries({ queryKey: ["campaign", campaignId] });
      const previous = queryClient.getQueryData(["campaign", campaignId]);
      queryClient.setQueryData(["campaign", campaignId], (old: Campaign) =>
        old ? { ...old, color } : old
      );
      return { previous };
    },
    onError: (_err, _color, ctx) => {
      queryClient.setQueryData(["campaign", campaignId], ctx?.previous);
    },
    onSuccess: () => {
      invalidateCampaignLists();
      closeSettings();
    },
  });

  const breadcrumbItems = buildBreadcrumbs(
    t,
    orgId,
    org?.name,
    campaign,
    project,
    subproject,
    subprojectProject
  );

  const color = campaign?.color;

  return (
    <Stack gap="lg" h="100%" style={{ overflow: "hidden" }}>
      <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

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
          value={campaign?.name ?? ""}
          order={2}
          canEdit={canSettings}
          onSave={(name) => renameMutation.mutateAsync(name).then(() => {})}
        />
        <Group gap={6}>
          {canSettings && (
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

      <ScopeSettingsModal
        opened={settingsOpened}
        onClose={closeSettings}
        currentColor={campaign?.color}
        onSave={(color) => settingsMutation.mutate(color)}
        isPending={settingsMutation.isPending}
        error={settingsMutation.error}
      />

      {orgId && (
        <MembersDrawer
          showGroups
          orgId={orgId}
          scopeType="campaign"
          scopeId={campaignId!}
          opened={membersOpened}
          onClose={closeMembers}
        />
      )}

      {orgId && (
        <ConversationsSection
          organizationId={orgId}
          scopeId={campaignId!}
          scopeType="campaign"
          queryKey={["campaign", campaignId!]}
        />
      )}
    </Stack>
  );
}

function buildBreadcrumbs(
  t: (key: string) => string,
  orgId: string | undefined,
  orgName: string | undefined,
  campaign: { name: string; parent_type: string; parent_id: string } | undefined,
  project: { id: string; name: string } | undefined,
  subproject: { id: string; name: string; project_id: string } | undefined,
  subprojectProject: { id: string; name: string } | undefined
) {
  const items: React.ReactNode[] = [
    <Anchor key="orgs" component={Link} to="/orgs" size="sm">
      {t("orgs.title")}
    </Anchor>,
    <Anchor key="org" component={Link} to={`/orgs/${orgId}`} size="sm">
      {orgName ?? "…"}
    </Anchor>,
  ];

  if (campaign?.parent_type === "project" && project) {
    items.push(
      <Anchor key="project" component={Link} to={`/orgs/${orgId}/projects/${project.id}`} size="sm">
        {project.name}
      </Anchor>
    );
  } else if (campaign?.parent_type === "subproject" && subproject) {
    const proj = subprojectProject;
    if (proj) {
      items.push(
        <Anchor key="project" component={Link} to={`/orgs/${orgId}/projects/${proj.id}`} size="sm">
          {proj.name}
        </Anchor>
      );
    }
    items.push(
      <Anchor
        key="subproject"
        component={Link}
        to={`/orgs/${orgId}/projects/${proj?.id}/subprojects/${subproject.id}`}
        size="sm"
      >
        {subproject.name}
      </Anchor>
    );
  }

  items.push(
    <Text key="campaign" size="sm">
      {campaign?.name ?? "…"}
    </Text>
  );

  return items;
}
