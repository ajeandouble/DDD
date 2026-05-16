import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Title, Stack, Breadcrumbs, Anchor, Text, Group, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getOrganization, getProject, getSubproject, getCampaigns } from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";
import { MembersDrawer } from "../components/MembersDrawer";
import { useCanManageMembers } from "../hooks/useMyRoles";

export function CampaignPage() {
  const { orgId, projectId, subprojectId, campaignId } = useParams<{
    orgId: string;
    projectId: string;
    subprojectId: string;
    campaignId: string;
  }>();

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

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", subprojectId],
    queryFn: () => getCampaigns(subprojectId!),
    retry: false,
  });

  const campaign = campaigns?.find((c) => c.id === campaignId);
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const canManageMembers = useCanManageMembers(orgId, "campaign", campaignId);

  return (
    <Stack gap="lg">
      <Breadcrumbs>
        <Anchor component={Link} to="/orgs" size="sm">
          Organizations
        </Anchor>
        <Anchor component={Link} to={`/orgs/${orgId}`} size="sm">
          {org?.name ?? orgId}
        </Anchor>
        <Anchor component={Link} to={`/orgs/${orgId}/projects/${projectId}`} size="sm">
          {project?.name ?? projectId}
        </Anchor>
        <Anchor
          component={Link}
          to={`/orgs/${orgId}/projects/${projectId}/subprojects/${subprojectId}`}
          size="sm"
        >
          {subproject?.name ?? subprojectId}
        </Anchor>
        <Text size="sm">{campaign?.name ?? campaignId}</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Title order={2}>{campaign?.name}</Title>
        {canManageMembers && (
          <Button size="xs" variant="light" onClick={openMembers}>
            Members
          </Button>
        )}
      </Group>

      <MembersDrawer
        orgId={orgId!}
        scopeType="campaign"
        scopeId={campaignId!}
        opened={membersOpened}
        onClose={closeMembers}
      />

      <ConversationsSection
        organizationId={orgId!}
        scopeId={campaignId!}
        scopeType="campaign"
        queryKey={["campaign", campaignId!]}
      />
    </Stack>
  );
}
