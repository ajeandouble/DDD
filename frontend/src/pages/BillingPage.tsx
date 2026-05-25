import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Group,
  Badge,
  Progress,
  Card,
  Button,
  Modal,
  TextInput,
  SimpleGrid,
  Table,
  Loader,
  Alert,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getSubscription, upgradeSubscription, getUsage, getInvoices } from "../lib/api";
import { useMyRoles } from "../hooks/useMyRoles";
import { useTranslation } from "react-i18next";

const PLANS = [
  {
    tier: "starter" as const,
    label: "Starter",
    price: "Free",
    priceTag: null as string | null,
    tokens: "10,000 tokens / month",
    webhooks: false,
    color: "gray" as const,
  },
  {
    tier: "pro" as const,
    label: "Pro",
    price: "$49 / month",
    priceTag: "$49/month",
    tokens: "100,000 tokens / month",
    webhooks: true,
    color: "blue" as const,
  },
  {
    tier: "enterprise" as const,
    label: "Enterprise",
    price: "Custom",
    priceTag: null as string | null,
    tokens: "Unlimited tokens",
    webhooks: true,
    color: "violet" as const,
  },
];

export function BillingPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [paymentOpen, { open: openPayment, close: closePayment }] = useDisclosure(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", orgId],
    queryFn: () => getSubscription(orgId!),
    retry: false,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage", orgId],
    queryFn: () => getUsage(orgId!),
    retry: false,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => getInvoices(orgId!),
    retry: false,
  });

  const { data: myRoles } = useMyRoles(orgId);
  const isAdmin = myRoles?.org === "admin";

  const upgradeMutation = useMutation({
    mutationFn: (tier: string) => upgradeSubscription(orgId!, tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription", orgId] });
      closePayment();
      setPendingTier(null);
    },
  });

  function handleSelectPlan(tier: string) {
    if (!isAdmin || tier === subscription?.tier) return;
    const plan = PLANS.find((p) => p.tier === tier)!;
    if (plan.priceTag) {
      setPendingTier(tier);
      openPayment();
    } else {
      upgradeMutation.mutate(tier);
    }
  }

  if (subLoading) return <Loader size="sm" />;

  const tokenLimit =
    subscription?.tokens_remaining != null
      ? subscription.tokens_used + subscription.tokens_remaining
      : null;
  const tokenPct = tokenLimit ? Math.round((subscription!.tokens_used / tokenLimit) * 100) : 0;
  const currentPlan = PLANS.find((p) => p.tier === subscription?.tier);

  return (
    <Stack gap="lg" maw={860}>
      <Title order={2}>{t("billing.title")}</Title>

      {subscription && (
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              {t("billing.currentPlan")}
            </Text>
            <Badge size="lg" variant="filled" color={currentPlan?.color ?? "gray"}>
              {subscription.tier ? t(`billing.plans.${subscription.tier}`) : subscription.tier}
            </Badge>
          </Group>
          {subscription.tokens_remaining != null ? (
            <>
              <Group justify="space-between" mb={4}>
                <Text size="sm" c="dimmed">
                  {t("billing.tokenUsage")}
                </Text>
                <Text size="sm">
                  {subscription.tokens_used.toLocaleString()} / {tokenLimit?.toLocaleString()}{" "}
                  {t("billing.tokensUsed")}
                </Text>
              </Group>
              <Progress
                value={tokenPct}
                color={tokenPct >= 90 ? "red" : tokenPct >= 70 ? "yellow" : "blue"}
                size="sm"
                mb="xs"
              />
            </>
          ) : (
            <Text size="sm" c="dimmed" mb="xs">
              {t("billing.unlimited")}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {new Date(subscription.reset_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </Card>
      )}

      <div>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>{t("billing.plansTitle")}</Text>
          {!isAdmin && (
            <Text size="xs" c="dimmed">
              {t("billing.adminRequired")}
            </Text>
          )}
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.tier === plan.tier;
            const tierLabel = t(`billing.plans.${plan.tier}`);
            const tierPrice =
              plan.tier === "starter"
                ? t("billing.plans.free")
                : plan.tier === "enterprise"
                  ? t("billing.custom")
                  : plan.price;
            const tierTokens =
              plan.tier === "starter"
                ? t("billing.starterTokens")
                : plan.tier === "pro"
                  ? t("billing.proTokens")
                  : t("billing.unlimited");
            return (
              <Card key={plan.tier} withBorder radius="md" p="md" style={{ position: "relative" }}>
                {isCurrent && (
                  <Badge
                    size="xs"
                    variant="dot"
                    color="green"
                    style={{ position: "absolute", top: 12, right: 12 }}
                  >
                    {t("billing.current")}
                  </Badge>
                )}
                <Text fw={700} size="lg" mb={4}>
                  {tierLabel}
                </Text>
                <Text size="xl" fw={800} c={plan.color} mb="sm">
                  {tierPrice}
                </Text>
                <Stack gap={4} mb="md">
                  <Text size="sm">{tierTokens}</Text>
                  <Text size="sm" c={plan.webhooks ? undefined : "dimmed"}>
                    {plan.webhooks ? t("billing.webhooksIncluded") : t("billing.webhooksExcluded")}
                  </Text>
                </Stack>
                {isAdmin && !isCurrent && (
                  <Button
                    size="xs"
                    variant={plan.tier === "enterprise" ? "light" : "filled"}
                    color={plan.color}
                    fullWidth
                    loading={
                      upgradeMutation.isPending &&
                      (pendingTier === plan.tier ||
                        (!pendingTier && plan.tier === "starter") ||
                        (!pendingTier && plan.tier === "enterprise"))
                    }
                    onClick={() => handleSelectPlan(plan.tier)}
                  >
                    {plan.tier === "starter"
                      ? t("billing.downgradeFree")
                      : plan.tier === "enterprise"
                        ? t("billing.upgradeToEnterprise")
                        : t("billing.upgradeToPro")}
                  </Button>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
        {upgradeMutation.isError && (
          <Alert color="red" mt="sm">
            {String(upgradeMutation.error)}
          </Alert>
        )}
      </div>

      <div>
        <Text fw={600} mb="sm">
          {t("billing.usageHistory")}
        </Text>
        {usageLoading && <Loader size="sm" />}
        {!usageLoading && usage?.length === 0 && (
          <Text size="sm" c="dimmed">
            {t("billing.noUsage")}
          </Text>
        )}
        {usage && usage.length > 0 && (
          <Table withTableBorder withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("billing.date")}</Table.Th>
                <Table.Th>{t("billing.conversation")}</Table.Th>
                <Table.Th>{t("billing.duration")}</Table.Th>
                <Table.Th>{t("billing.tokens")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {usage.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(r.created_at).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {r.conversation_id.slice(0, 8)}…
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{r.duration_seconds.toFixed(1)}s</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={500}>
                      {r.tokens_consumed}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      <div>
        <Text fw={600} mb="sm">
          {t("billing.invoices")}
        </Text>
        {invoicesLoading && <Loader size="sm" />}
        {!invoicesLoading && invoices?.length === 0 && (
          <Text size="sm" c="dimmed">
            {t("billing.noInvoices")}
          </Text>
        )}
        {invoices && invoices.length > 0 && (
          <Table withTableBorder withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("billing.period")}</Table.Th>
                <Table.Th>{t("billing.lineItems")}</Table.Th>
                <Table.Th>{t("billing.tokens")}</Table.Th>
                <Table.Th>{t("billing.generatedAt")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invoices.map((inv) => (
                <Table.Tr key={inv.id}>
                  <Table.Td>
                    <Text size="xs">
                      {new Date(inv.period_start).toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{inv.line_items.length}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={500}>
                      {inv.total_tokens.toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(inv.generated_at).toLocaleString()}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      <FakePaymentModal
        opened={paymentOpen}
        tier={pendingTier}
        onClose={() => {
          closePayment();
          setPendingTier(null);
        }}
        onConfirm={(tier) => upgradeMutation.mutate(tier)}
        loading={upgradeMutation.isPending}
      />
    </Stack>
  );
}

function FakePaymentModal({
  opened,
  tier,
  onClose,
  onConfirm,
  loading,
}: {
  opened: boolean;
  tier: string | null;
  onClose: () => void;
  onConfirm: (tier: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("Test User");

  const plan = PLANS.find((p) => p.tier === tier);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={tier ? t(`billing.plans.${tier}`) : ""}
      size="sm"
      centered
    >
      <Stack gap="sm">
        <Alert color="blue" variant="light">
          {t("billing.simPaymentInfo")}
        </Alert>
        <TextInput
          label={t("billing.cardNumber")}
          value={cardNumber}
          onChange={(e) => setCardNumber(e.currentTarget.value)}
          styles={{ input: { fontFamily: "monospace" } }}
        />
        <Group grow>
          <TextInput
            label={t("billing.expiry")}
            value={expiry}
            onChange={(e) => setExpiry(e.currentTarget.value)}
          />
          <TextInput label="CVC" value={cvc} onChange={(e) => setCvc(e.currentTarget.value)} />
        </Group>
        <TextInput
          label={t("billing.nameOnCard")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            <strong>{plan?.price}</strong>
          </Text>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button size="xs" loading={loading} onClick={() => tier && onConfirm(tier)}>
              {t("billing.pay")} {plan?.price}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
