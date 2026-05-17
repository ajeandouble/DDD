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

  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const canManageMembersOnScope = useCanManageMembers(orgId, "campaign", campaignId);

  const { data: myRoles } = useMyRoles(orgId);
  const scopeRole = myRoles ? getEffectiveRole("campaign", campaignId!, myRoles) : null;
  const canSettings = canManageMembers(scopeRole);

  const settingsMutation = useMutation({
    mutationFn: (color: string | null) => updateCampaignSettings(campaignId!, { color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      closeSettings();
    },
  });

  const breadcrumbItems = buildBreadcrumbs(
    orgId,
    org?.name,
    campaign,
    project,
    subproject,
    subprojectProject
  );

  const color = campaign?.color;

  return (
    <Stack gap="lg">
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
          onSave={(name) => renameCampaign(campaignId!, name).then((c) => {
            queryClient.setQueryData(["campaign", campaignId], c);
          })}
        />
        <Group gap={6}>
          {canSettings && (
            <Button size="xs" variant="light" onClick={openSettings}>
              Settings
            </Button>
          )}
          {canManageMembersOnScope && (
            <Button size="xs" variant="light" onClick={openMembers}>
              Members
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
  orgId: string | undefined,
  orgName: string | undefined,
  campaign: { name: string; parent_type: string; parent_id: string } | undefined,
  project: { id: string; name: string } | undefined,
  subproject: { id: string; name: string; project_id: string } | undefined,
  subprojectProject: { id: string; name: string } | undefined
) {
  const items: React.ReactNode[] = [
    <Anchor key="orgs" component={Link} to="/orgs" size="sm">
      Organizations
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
