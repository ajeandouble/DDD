import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Group,
  Button,
  Modal,
  TextInput,
  SimpleGrid,
  Card,
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
} from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";
import { MembersDrawer } from "../components/MembersDrawer";
import { useCanManageMembers } from "../hooks/useMyRoles";

export function CampaignsPage() {
  const { orgId, projectId, subprojectId } = useParams<{
    orgId: string;
    projectId: string;
    subprojectId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const canManageMembers = useCanManageMembers(orgId, "subproject", subprojectId);
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

  return (
    <>
      <Modal opened={opened} onClose={close} title="New campaign" centered>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Email blast Jan 2025"
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
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

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
          <Text size="sm">{subproject?.name ?? subprojectId}</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Title order={2}>{subproject?.name}</Title>
          {canManageMembers && (
            <Button size="xs" variant="light" onClick={openMembers}>
              Members
            </Button>
          )}
        </Group>

        <MembersDrawer
          orgId={orgId!}
          scopeType="subproject"
          scopeId={subprojectId!}
          opened={membersOpened}
          onClose={closeMembers}
        />

        <ConversationsSection
          organizationId={orgId!}
          scopeId={subprojectId!}
          scopeType="subproject"
          queryKey={["subproject", subprojectId!]}
        />

        <Group justify="space-between" mt="sm">
          <Text fw={600}>Campaigns</Text>
          <Button size="xs" onClick={open}>
            New campaign
          </Button>
        </Group>

        {isLoading && <Loader />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && (
          <Text c="dimmed" size="sm">
            No campaigns yet.
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {data?.map((campaign) => (
            <Card
              key={campaign.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              style={{ cursor: "pointer" }}
              onClick={() =>
                navigate(
                  `/orgs/${orgId}/projects/${projectId}/subprojects/${subprojectId}/campaigns/${campaign.id}`
                )
              }
            >
              <Text fw={500}>{campaign.name}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
