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
import { getSubscription, upgradeSubscription, getUsage } from "../lib/api";
import { useMyRoles } from "../hooks/useMyRoles";

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
      <Title order={2}>Billing</Title>

      {subscription && (
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              Current plan
            </Text>
            <Badge size="lg" variant="filled" color={currentPlan?.color ?? "gray"}>
              {currentPlan?.label ?? subscription.tier}
            </Badge>
          </Group>
          {subscription.tokens_remaining != null ? (
            <>
              <Group justify="space-between" mb={4}>
                <Text size="sm" c="dimmed">
                  Token usage
                </Text>
                <Text size="sm">
                  {subscription.tokens_used.toLocaleString()} / {tokenLimit?.toLocaleString()} used
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
              Unlimited token usage
            </Text>
          )}
          <Text size="xs" c="dimmed">
            Resets{" "}
            {new Date(subscription.reset_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </Card>
      )}

      <div>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Plans</Text>
          {!isAdmin && (
            <Text size="xs" c="dimmed">
              Plan changes require admin access.
            </Text>
          )}
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.tier === plan.tier;
            return (
              <Card key={plan.tier} withBorder radius="md" p="md" style={{ position: "relative" }}>
                {isCurrent && (
                  <Badge
                    size="xs"
                    variant="dot"
                    color="green"
                    style={{ position: "absolute", top: 12, right: 12 }}
                  >
                    Current
                  </Badge>
                )}
                <Text fw={700} size="lg" mb={4}>
                  {plan.label}
                </Text>
                <Text size="xl" fw={800} c={plan.color} mb="sm">
                  {plan.price}
                </Text>
                <Stack gap={4} mb="md">
                  <Text size="sm">{plan.tokens}</Text>
                  <Text size="sm" c={plan.webhooks ? undefined : "dimmed"}>
                    {plan.webhooks ? "✓ Webhooks" : "✗ No webhooks"}
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
                      ? "Downgrade to Free"
                      : plan.tier === "enterprise"
                        ? "Upgrade to Enterprise"
                        : "Upgrade to Pro"}
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
          Usage history
        </Text>
        {usageLoading && <Loader size="sm" />}
        {!usageLoading && usage?.length === 0 && (
          <Text size="sm" c="dimmed">
            No usage records yet. Records appear after audio is transcribed.
          </Text>
        )}
        {usage && usage.length > 0 && (
          <Table withTableBorder withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Conversation</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Tokens</Table.Th>
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
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("Test User");

  const plan = PLANS.find((p) => p.tier === tier);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Upgrade to ${plan?.label ?? tier}`}
      size="sm"
      centered
    >
      <Stack gap="sm">
        <Alert color="blue" variant="light">
          Simulated payment — no real charge will occur.
        </Alert>
        <TextInput
          label="Card number"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.currentTarget.value)}
          styles={{ input: { fontFamily: "monospace" } }}
        />
        <Group grow>
          <TextInput
            label="Expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.currentTarget.value)}
          />
          <TextInput label="CVC" value={cvc} onChange={(e) => setCvc(e.currentTarget.value)} />
        </Group>
        <TextInput
          label="Name on card"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total: <strong>{plan?.price}</strong>
          </Text>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button size="xs" loading={loading} onClick={() => tier && onConfirm(tier)}>
              Pay {plan?.price}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
