import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Title, Stack, Breadcrumbs, Anchor, Text, Group, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getCampaign, getOrganization, getProject, getSubproject } from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";
import { MembersDrawer } from "../components/MembersDrawer";
import { useCanManageMembers } from "../hooks/useMyRoles";

export function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();

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
  const canManageMembers = useCanManageMembers(orgId, "campaign", campaignId);

  const breadcrumbItems = buildBreadcrumbs(
    orgId,
    org?.name,
    campaign,
    project,
    subproject,
    subprojectProject,
  );

  return (
    <Stack gap="lg">
      <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

      <Group justify="space-between">
        <Title order={2}>{campaign?.name}</Title>
        {canManageMembers && (
          <Button size="xs" variant="light" onClick={openMembers}>
            Members
          </Button>
        )}
      </Group>

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
  subprojectProject: { id: string; name: string } | undefined,
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
      <Anchor
        key="project"
        component={Link}
        to={`/orgs/${orgId}/projects/${project.id}`}
        size="sm"
      >
        {project.name}
      </Anchor>,
    );
  } else if (campaign?.parent_type === "subproject" && subproject) {
    const proj = subprojectProject;
    if (proj) {
      items.push(
        <Anchor
          key="project"
          component={Link}
          to={`/orgs/${orgId}/projects/${proj.id}`}
          size="sm"
        >
          {proj.name}
        </Anchor>,
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
      </Anchor>,
    );
  }

  items.push(
    <Text key="campaign" size="sm">
      {campaign?.name ?? "…"}
    </Text>,
  );

  return items;
}
