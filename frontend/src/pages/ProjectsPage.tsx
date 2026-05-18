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
import { ScopeCard } from "../components/ScopeCard";
import { useDisclosure } from "@mantine/hooks";
import {
  getOrganization,
  getProjects,
  createProject,
  getCampaignsByOrg,
  createCampaignUnderOrg,
} from "../lib/api";
import { MembersDrawer } from "../components/MembersDrawer";
import { useCanManageMembers, useCanAdmin, useMyRoles } from "../hooks/useMyRoles";
import { useTranslation } from "react-i18next";

export function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [projectModalOpened, { open: openProjectModal, close: closeProjectModal }] =
    useDisclosure(false);
  const [campaignModalOpened, { open: openCampaignModal, close: closeCampaignModal }] =
    useDisclosure(false);
  const [membersOpened, { open: openMembers, close: closeMembers }] = useDisclosure(false);
  const canManageMembers = useCanManageMembers(orgId, "org", orgId);
  const canAdminOrg = useCanAdmin(orgId, "org", orgId);
  const { data: myRoles } = useMyRoles(orgId);
  const isOrgMember = myRoles != null;
  const [projectName, setProjectName] = useState("");
  const [campaignName, setCampaignName] = useState("");

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getOrganization(orgId!),
    retry: false,
  });

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
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
      <Modal
        opened={projectModalOpened}
        onClose={closeProjectModal}
        title={t("projects.modalTitle")}
        centered
      >
        <Stack>
          <TextInput
            label={t("common.name")}
            placeholder={t("projects.namePlaceholder")}
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
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createProjectMutation.mutate()}
              loading={createProjectMutation.isPending}
            >
              {t("common.create")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={campaignModalOpened}
        onClose={closeCampaignModal}
        title={t("campaigns.modalTitle")}
        centered
      >
        <Stack>
          <TextInput
            label={t("common.name")}
            placeholder={t("campaigns.namePlaceholder")}
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
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createCampaignMutation.mutate()}
              loading={createCampaignMutation.isPending}
            >
              {t("common.create")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} to="/orgs" size="sm">
            {t("orgs.title")}
          </Anchor>
          <Text size="sm">{org?.name ?? orgId}</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Title order={2}>{org?.name}</Title>
          <Group gap={6}>
            {isOrgMember && (
              <Button size="xs" variant="light" component={Link} to={`/orgs/${orgId}/billing`}>
                {t("billing.title")}
              </Button>
            )}
            {canAdminOrg && (
              <Button size="xs" variant="light" component={Link} to={`/orgs/${orgId}/webhooks`}>
                {t("webhooks.title")}
              </Button>
            )}
            {canManageMembers && (
              <Button size="xs" variant="light" onClick={openMembers}>
                {t("members.title")}
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
          <Text fw={600}>{t("projects.campaigns")}</Text>
          <Button size="xs" onClick={openCampaignModal}>
            {t("campaigns.new")}
          </Button>
        </Group>

        {campaignsLoading && <Loader size="sm" />}
        {campaigns?.length === 0 && (
          <Text c="dimmed" size="sm">
            {t("campaigns.noCampaigns")}
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

        {/* Projects */}
        <Group justify="space-between" mt="sm">
          <Text fw={600}>{t("projects.title")}</Text>
          <Button size="xs" onClick={openProjectModal}>
            {t("projects.new")}
          </Button>
        </Group>

        {projectsLoading && <Loader />}
        {projectsError && <Alert color="red">{String(projectsError)}</Alert>}
        {projects?.length === 0 && (
          <Text c="dimmed" size="sm">
            {t("projects.noProjects")}
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {projects?.map((project) => (
            <ScopeCard
              key={project.id}
              name={project.name}
              color={project.color}
              onClick={() => navigate(`/orgs/${orgId}/projects/${project.id}`)}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
