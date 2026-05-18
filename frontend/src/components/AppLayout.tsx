import { Navigate, Outlet, Link, useNavigate, useMatch } from "react-router-dom";
import {
  AppShell,
  ActionIcon,
  Group,
  Text,
  Button,
  NavLink,
  Stack,
  Divider,
  Burger,
  Skeleton,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "../lib/api";

export function AppLayout() {
  const navigate = useNavigate();
  const [navbarOpened, { toggle, close: closeNavbar }] = useDisclosure();
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const orgsMatch = useMatch("/orgs/:orgId/*");
  const activeOrgId = orgsMatch?.params.orgId;

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    retry: false,
  });

  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }

  function handleSignOut() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !navbarOpened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={navbarOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text
              fw={700}
              size="lg"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/orgs")}
            >
              DDD
            </Text>
          </Group>
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Toggle color scheme"
              onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}
            >
              {computed === "dark" ? "☀" : "☽"}
            </ActionIcon>
            <Button variant="subtle" size="xs" color="gray" onClick={handleSignOut}>
              Sign out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" px={8} py={4} fw={600}>
            ORGANIZATIONS
          </Text>
          {isLoading && (
            <>
              <Skeleton height={32} radius="sm" />
              <Skeleton height={32} radius="sm" />
            </>
          )}
          {orgs?.map((org) => (
            <NavLink
              key={org.id}
              component={Link}
              to={`/orgs/${org.id}`}
              label={org.name}
              active={activeOrgId === org.id}
              onClick={closeNavbar}
            />
          ))}
          {orgs?.length === 0 && (
            <Text size="xs" c="dimmed" px={8}>
              No organizations yet.
            </Text>
          )}
          <Divider my={4} />
          <NavLink
            component={Link}
            to="/settings"
            label="Settings"
            onClick={closeNavbar}
            c="dimmed"
            styles={{ label: { fontSize: "var(--mantine-font-size-xs)" } }}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
