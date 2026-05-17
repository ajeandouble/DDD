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
  getProjects,
  createProject,
  getCampaignsByOrg,
  createCampaignUnderOrg,
} from "../lib/api";
import { MembersDrawer } from "../components/MembersDrawer";
import { useCanManageMembers } from "../hooks/useMyRoles";

export function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projectModalOpened, { open: openProjectModal, close: closeProjectModal }] =
    useDisclosure(false);
  const [campaignModalOpened, { open: openCampaignModal, close: closeCampaignModal }] =
    useDisclosure(false);
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const canManageMembers = useCanManageMembers(orgId, "org", orgId);
  const [projectName, setProjectName] = useState("");
  const [campaignName, setCampaignName] = useState("");

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getOrganization(orgId!),
    retry: false,
  });

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => getProjects(orgId!),
    retry: false,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns-by-org", orgId],
    queryFn: () => getCampaignsByOrg(orgId!),
    retry: false,
  });

  const createProjectMutation = useMutation({
    mutationFn: () => createProject(orgId!, projectName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
      closeProjectModal();
      setProjectName("");
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: () => createCampaignUnderOrg(orgId!, campaignName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns-by-org", orgId] });
      closeCampaignModal();
      setCampaignName("");
    },
  });

  return (
    <>
      <Modal opened={projectModalOpened} onClose={closeProjectModal} title="New project" centered>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Q4 Campaign"
            value={projectName}
            onChange={(e) => setProjectName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && createProjectMutation.mutate()}
            data-autofocus
          />
          {createProjectMutation.isError && (
            <Text size="sm" c="red">
              {String(createProjectMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeProjectModal}>
              Cancel
            </Button>
            <Button
              onClick={() => createProjectMutation.mutate()}
              loading={createProjectMutation.isPending}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={campaignModalOpened}
        onClose={closeCampaignModal}
        title="New campaign"
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Summer blast"
            value={campaignName}
            onChange={(e) => setCampaignName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && createCampaignMutation.mutate()}
            data-autofocus
          />
          {createCampaignMutation.isError && (
            <Text size="sm" c="red">
              {String(createCampaignMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCampaignModal}>
              Cancel
            </Button>
            <Button
              onClick={() => createCampaignMutation.mutate()}
              loading={createCampaignMutation.isPending}
            >
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
          <Text size="sm">{org?.name ?? orgId}</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Title order={2}>{org?.name}</Title>
          <Group gap={6}>
            {canManageMembers && (
              <Button size="xs" variant="light" component={Link} to={`/orgs/${orgId}/webhooks`}>
                Webhooks
              </Button>
            )}
            {canManageMembers && (
              <Button size="xs" variant="light" onClick={openMembers}>
                Members
              </Button>
            )}
          </Group>
        </Group>

        <MembersDrawer
          orgId={orgId!}
          scopeType="org"
          scopeId={orgId!}
          opened={membersOpened}
          onClose={closeMembers}
          showGroups
        />

        {/* Direct campaigns under this org */}
        <Group justify="space-between" mt="sm">
          <Text fw={600}>Campaigns</Text>
          <Button size="xs" onClick={openCampaignModal}>
            New campaign
          </Button>
        </Group>

        {campaignsLoading && <Loader size="sm" />}
        {campaigns?.length === 0 && (
          <Text c="dimmed" size="sm">
            No campaigns yet.
          </Text>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {campaigns?.map((c) => (
            <Card
              key={c.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/campaigns/${c.id}`)}
            >
              <Text fw={500}>{c.name}</Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* Projects */}
        <Group justify="space-between" mt="sm">
          <Text fw={600}>Projects</Text>
          <Button size="xs" onClick={openProjectModal}>
            New project
          </Button>
        </Group>

        {projectsLoading && <Loader />}
        {projectsError && <Alert color="red">{String(projectsError)}</Alert>}
        {projects?.length === 0 && (
          <Text c="dimmed" size="sm">
            No projects yet.
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {projects?.map((project) => (
            <Card
              key={project.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/orgs/${orgId}/projects/${project.id}`)}
            >
              <Text fw={500}>{project.name}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
