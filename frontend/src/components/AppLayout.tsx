import { Navigate, Outlet, Link, useNavigate, useMatch } from "react-router-dom";
import { SSEContext } from "../context/SSEContext";
import { useSSE } from "../hooks/useSSE";
import {
  AppShell,
  ActionIcon,
  Avatar,
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
import { useTranslation } from "react-i18next";
import { getOrganizations, getMe, avatarUrl } from "../lib/api";

export function AppLayout() {
  const navigate = useNavigate();
  const [navbarOpened, { toggle, close: closeNavbar }] = useDisclosure();
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const orgsMatch = useMatch("/orgs/:orgId/*");
  const { t, i18n } = useTranslation();
  const activeOrgId = orgsMatch?.params.orgId;

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    retry: false,
  });

  const sseConnected = useSSE();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    enabled: !!localStorage.getItem("token"),
    staleTime: Infinity,
    select: (user) => {
      if (user.locale && user.locale !== i18n.language) {
        i18n.changeLanguage(user.locale);
      }
      return user;
    },
  });

  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }

  function handleSignOut() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  return (
    <SSEContext.Provider value={sseConnected}>
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
              <Avatar
                src={me?.has_avatar ? avatarUrl(me.id) : undefined}
                size={28}
                radius="xl"
                color="blue"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/settings")}
              >
                {me?.email?.[0]?.toUpperCase()}
              </Avatar>
              <Button variant="subtle" size="xs" color="gray" onClick={handleSignOut}>
                {t("nav.signOut")}
              </Button>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="xs">
          <Stack gap={2}>
            <Text size="xs" c="dimmed" px={8} py={4} fw={600}>
              {t("nav.organizations")}
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
                {t("nav.noOrgs")}
              </Text>
            )}
            <Divider my={4} />
            <NavLink
              component={Link}
              to="/settings"
              label={t("nav.settings")}
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
    </SSEContext.Provider>
  );
}
