import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Title, Stack, Breadcrumbs, Anchor, Text } from "@mantine/core";
import { getOrganization, getProject, getSubproject, getCampaigns } from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";

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

  return (
    <Stack gap="lg">
      <Breadcrumbs>
        <Anchor component={Link} to="/orgs" size="sm">Organizations</Anchor>
        <Anchor component={Link} to={`/orgs/${orgId}`} size="sm">{org?.name ?? orgId}</Anchor>
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

      <Title order={2}>{campaign?.name}</Title>

      <ConversationsSection
        organizationId={orgId!}
        scopeId={campaignId!}
        scopeType="campaign"
        queryKey={["campaign", campaignId!]}
      />
    </Stack>
  );
}
