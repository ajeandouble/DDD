import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getOrganizations, createOrganization } from "../lib/api";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () => createOrganization(name),
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      close();
      setName("");
      navigate(`/orgs/${org.id}`);
    },
  });

  return (
    <>
      <Modal opened={opened} onClose={close} title="New organization" centered>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && createMutation.mutate()}
            data-autofocus
          />
          {createMutation.isError && (
            <Text size="sm" c="red">{String(createMutation.error)}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Organizations</Title>
          <Button onClick={open}>New organization</Button>
        </Group>

        {isLoading && <Loader />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && (
          <Text c="dimmed">No organizations yet — create one or ask to be added to one.</Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {data?.map((org) => (
            <Card
              key={org.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/orgs/${org.id}`)}
            >
              <Text fw={600} size="lg">{org.name}</Text>
              <Text size="sm" c="dimmed" mt={4}>
                {org.member_ids.length} member{org.member_ids.length !== 1 ? "s" : ""}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
