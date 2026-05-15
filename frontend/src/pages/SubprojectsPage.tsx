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
import { getOrganization, getProject, getSubprojects, createSubproject } from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";

export function SubprojectsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["subprojects", projectId],
    queryFn: () => getSubprojects(projectId!),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => createSubproject(projectId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subprojects", projectId] });
      close();
      setName("");
    },
  });

  return (
    <>
      <Modal opened={opened} onClose={close} title="New subproject" centered>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Phase 1"
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
          <Text size="sm">{project?.name ?? projectId}</Text>
        </Breadcrumbs>

        <Title order={2}>{project?.name}</Title>

        <ConversationsSection
          organizationId={orgId!}
          scopeId={projectId!}
          scopeType="project"
          queryKey={["project", projectId!]}
        />

        <Group justify="space-between" mt="sm">
          <Text fw={600}>Subprojects</Text>
          <Button size="xs" onClick={open}>
            New subproject
          </Button>
        </Group>

        {isLoading && <Loader />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && (
          <Text c="dimmed" size="sm">
            No subprojects yet.
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {data?.map((sp) => (
            <Card
              key={sp.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/orgs/${orgId}/projects/${projectId}/subprojects/${sp.id}`)}
            >
              <Text fw={500}>{sp.name}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
