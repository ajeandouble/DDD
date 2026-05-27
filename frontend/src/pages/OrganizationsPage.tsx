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
import { useTranslation } from "react-i18next";
import { getOrganizations, createOrganization } from "../lib/api";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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
      <Modal opened={opened} onClose={close} title={t("orgs.modalTitle")} centered>
        <Stack>
          <TextInput
            label={t("common.name")}
            placeholder={t("orgs.namePlaceholder")}
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
              {t("common.cancel")}
            </Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              {t("common.create")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>{t("orgs.title")}</Title>
          <Button onClick={open}>{t("orgs.new")}</Button>
        </Group>

        {isLoading && <Loader />}
        {error && <Alert color="red">{String(error)}</Alert>}
        {data?.length === 0 && <Text c="dimmed">{t("orgs.noOrgs")}</Text>}

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
              <Text fw={600} size="lg">
                {org.name}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                {t("orgs.members", { count: org.member_ids.length })}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}
