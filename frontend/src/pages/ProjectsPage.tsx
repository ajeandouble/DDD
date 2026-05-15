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
import { getOrganization, getProjects, createProject } from "../lib/api";
import { ConversationsSection } from "../components/ConversationsSection";

export function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getOrganization(orgId!),
    retry: false,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => getProjects(orgId!),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => createProject(orgId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
      close();
      setName("");
    },
  });

  return (
    <>
      <Modal opened={opened} onClose={close} title="New project" centered>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Q4 Campaign"
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
          <Text size="sm">{org?.name ?? orgId}</Text>
        </Breadcrumbs>

        <Title order={2}>{org?.name}</Title>

        <ConversationsSection organizationId={orgId!} queryKey={["org", orgId!]} />

        <Group justify="space-between" mt="sm">
          <Text fw={600}>Projects</Text>
          <Button size="xs" onClick={open}>
            New project
          </Button>
        </Group>

        {isLoading && <Loader />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && (
          <Text c="dimmed" size="sm">
            No projects yet.
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {data?.map((project) => (
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
