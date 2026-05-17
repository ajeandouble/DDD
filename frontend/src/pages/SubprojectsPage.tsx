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
  getSubprojects,
  createSubproject,
  getCampaignsByProject,
  createCampaignUnderProject,
  updateProjectSettings,
} from "../lib/api";
import { MembersDrawer } from "../components/MembersDrawer";
import { ScopeCard } from "../components/ScopeCard";
import { ScopeSettingsModal } from "../components/ScopeSettingsModal";
import { useCanManageMembers } from "../hooks/useMyRoles";

export function SubprojectsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subprojectModalOpened, { open: openSubprojectModal, close: closeSubprojectModal }] =
    useDisclosure(false);
  const [campaignModalOpened, { open: openCampaignModal, close: closeCampaignModal }] =
    useDisclosure(false);
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const canManageMembersOnScope = useCanManageMembers(orgId, "project", projectId);
  const [subprojectName, setSubprojectName] = useState("");
  const [campaignName, setCampaignName] = useState("");

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

  const {
    data: subprojects,
    isLoading: subprojectsLoading,
    error: subprojectsError,
  } = useQuery({
    queryKey: ["subprojects", projectId],
    queryFn: () => getSubprojects(projectId!),
    retry: false,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns-by-project", projectId],
    queryFn: () => getCampaignsByProject(projectId!),
    retry: false,
  });

  const createSubprojectMutation = useMutation({
    mutationFn: () => createSubproject(projectId!, subprojectName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subprojects", projectId] });
      closeSubprojectModal();
      setSubprojectName("");
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: () => createCampaignUnderProject(projectId!, campaignName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns-by-project", projectId] });
      closeCampaignModal();
      setCampaignName("");
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (color: string | null) => updateProjectSettings(projectId!, { color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      closeSettings();
    },
  });

  const color = project?.color;

  return (
    <>
      <Modal
        opened={subprojectModalOpened}
        onClose={closeSubprojectModal}
        title="New subproject"
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Phase 1"
            value={subprojectName}
            onChange={(e) => setSubprojectName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && createSubprojectMutation.mutate()}
            data-autofocus
          />
          {createSubprojectMutation.isError && (
            <Text size="sm" c="red">
              {String(createSubprojectMutation.error)}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeSubprojectModal}>
              Cancel
            </Button>
            <Button
              onClick={() => createSubprojectMutation.mutate()}
              loading={createSubprojectMutation.isPending}
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
            placeholder="Email blast Jan 2025"
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

      <ScopeSettingsModal
        opened={settingsOpened}
        onClose={closeSettings}
        currentColor={project?.color}
        onSave={(color) => settingsMutation.mutate(color)}
        isPending={settingsMutation.isPending}
        error={settingsMutation.error}
      />

      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} to="/orgs" size="sm">
            Organizations
          </Anchor>
          <Anchor component={Link} to={`/orgs/${orgId}`} size="sm">
            {org?.name ?? orgId}
          </Anchor>
          <Text size="sm">{project?.name ?? projectId}</Text>
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
          <Title order={2}>{project?.name}</Title>
          <Group gap={6}>
            {canManageMembersOnScope && (
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

        <MembersDrawer
          showGroups
          orgId={orgId!}
          scopeType="project"
          scopeId={projectId!}
          opened={membersOpened}
          onClose={closeMembers}
        />

        {/* Direct campaigns under this project */}
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
            <ScopeCard
              key={c.id}
              name={c.name}
              color={c.color}
              onClick={() => navigate(`/campaigns/${c.id}`)}
            />
          ))}
        </SimpleGrid>

        {/* Subprojects */}
        <Group justify="space-between" mt="sm">
          <Text fw={600}>Subprojects</Text>
          <Button size="xs" onClick={openSubprojectModal}>
            New subproject
          </Button>
        </Group>

        {subprojectsLoading && <Loader />}
        {subprojectsError && <Alert color="red">{String(subprojectsError)}</Alert>}
        {subprojects?.length === 0 && (
          <Text c="dimmed" size="sm">
            No subprojects yet.
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {subprojects?.map((sp) => (
            <ScopeCard
              key={sp.id}
              name={sp.name}
              color={sp.color}
              onClick={() =>
                navigate(`/orgs/${orgId}/projects/${projectId}/subprojects/${sp.id}`)
              }
            />
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
