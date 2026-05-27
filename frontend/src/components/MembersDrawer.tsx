import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  Tabs,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Select,
  Autocomplete,
  Divider,
  Loader,
  Alert,
  Accordion,
  TextInput,
  SegmentedControl,
  Checkbox,
  Paper,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  listRoles,
  assignRole,
  revokeRole,
  listUsers,
  listGroups,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  getMe,
  getMyRoles,
} from "../lib/api";
import type { RoleAssignment } from "../dto/iam";

const ROLE_COLORS: Record<string, string> = {
  admin: "red",
  supervisor: "orange",
  editor: "blue",
  viewer: "gray",
};

interface Props {
  orgId: string;
  scopeType: string;
  scopeId: string;
  opened: boolean;
  onClose: () => void;
  showGroups?: boolean;
}

export function MembersDrawer({ orgId, scopeType, scopeId, opened, onClose, showGroups }: Props) {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const ROLE_OPTIONS = [
    { value: "admin", label: t("roles.admin") },
    { value: "supervisor", label: t("roles.supervisor") },
    { value: "editor", label: t("roles.editor") },
    { value: "viewer", label: t("roles.viewer") },
  ];

  const [subjectType, setSubjectType] = useState<"user" | "group">("user");
  const [email, setEmail] = useState("");
  const [groupSubject, setGroupSubject] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupMemberEmail, setGroupMemberEmail] = useState<Record<string, string>>({});
  const [groupMemberSelected, setGroupMemberSelected] = useState<Record<string, Set<string>>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkRole, setBulkRole] = useState<string | null>(null);

  const rolesKey = ["roles", orgId, scopeType, scopeId];

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: rolesKey,
    queryFn: () => listRoles(orgId, { scope_type: scopeType, scope_id: scopeId }),
    enabled: opened,
  });

  const { data: users } = useQuery({
    queryKey: ["iam-users"],
    queryFn: listUsers,
    enabled: opened,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: opened,
  });

  const { data: groups } = useQuery({
    queryKey: ["groups", orgId],
    queryFn: () => listGroups(orgId),
    enabled: opened && !!showGroups,
  });

  const { data: myRoles } = useQuery({
    queryKey: ["my-roles", orgId],
    queryFn: () => getMyRoles(orgId),
    enabled: opened,
  });

  const MANAGE_ROLES = new Set(["supervisor", "admin"]);

  const effectiveRoleAtScope = (() => {
    switch (scopeType) {
      case "org":
        return myRoles?.org;
      case "project":
        return myRoles?.projects?.[scopeId];
      case "subproject":
        return myRoles?.subprojects?.[scopeId];
      case "campaign":
        return myRoles?.campaigns?.[scopeId];
      default:
        return null;
    }
  })();

  const canAssignRoles = !!effectiveRoleAtScope && MANAGE_ROLES.has(effectiveRoleAtScope);
  const canManageOrgGroups = !!myRoles?.org && MANAGE_ROLES.has(myRoles.org);
  const canCreateGroup = canAssignRoles;
  const canManageGroup = (g: { owner_id: string }) => canManageOrgGroups || g.owner_id === me?.id;

  const userById = Object.fromEntries(users?.map((u) => [u.id, u.email]) ?? []);
  const groupById = Object.fromEntries(groups?.map((g) => [g.id, g.name]) ?? []);

  const subjectLabel = (subject: string) => {
    if (subject.startsWith("user:")) return userById[subject.slice(5)] ?? subject;
    if (subject.startsWith("group:")) {
      const name = groupById[subject.slice(6)];
      return name ? `${t("members.subjectType.group")}: ${name}` : subject;
    }
    if (subject.startsWith("apikey:")) return `API Key: ${subject.slice(7, 15)}…`;
    return subject;
  };

  const invalidateRoles = () => {
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: rolesKey });
  };
  const invalidateGroups = () => qc.invalidateQueries({ queryKey: ["groups", orgId] });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!role) throw new Error(t("members.pickRole"));
      if (subjectType === "group") {
        if (!groupSubject) throw new Error(t("members.pickGroup"));
        return assignRole(orgId, {
          subject: `group:${groupSubject}`,
          role,
          scope_type: scopeType,
          scope_id: scopeId,
        });
      }
      const found = users?.find((u) => u.email === email);
      if (!found) throw new Error(t("members.userNotFound"));
      return assignRole(orgId, {
        subject: `user:${found.id}`,
        role,
        scope_type: scopeType,
        scope_id: scopeId,
      });
    },
    onSuccess: () => {
      invalidateRoles();
      setEmail("");
      setGroupSubject(null);
      setRole(null);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (a: RoleAssignment) =>
      revokeRole(orgId, {
        subject: a.subject,
        role: a.role,
        scope_type: a.scope_type,
        scope_id: a.scope_id,
      }),
    onSuccess: invalidateRoles,
  });

  const selectedAssignments = useMemo(
    () => (roles ?? []).filter((_, i) => selected.has(i)),
    [roles, selected]
  );

  const bulkRevokeMutation = useMutation({
    mutationFn: async () => {
      for (const a of selectedAssignments) {
        await revokeRole(orgId, {
          subject: a.subject,
          role: a.role,
          scope_type: a.scope_type,
          scope_id: a.scope_id,
        });
      }
    },
    onSuccess: () => {
      invalidateRoles();
      setSelected(new Set());
    },
  });

  const bulkReassignMutation = useMutation({
    mutationFn: async (newRole: string) => {
      for (const a of selectedAssignments) {
        await revokeRole(orgId, {
          subject: a.subject,
          role: a.role,
          scope_type: a.scope_type,
          scope_id: a.scope_id,
        });
        await assignRole(orgId, {
          subject: a.subject,
          role: newRole,
          scope_type: a.scope_type,
          scope_id: a.scope_id,
        });
      }
    },
    onSuccess: () => {
      invalidateRoles();
      setSelected(new Set());
      setBulkRole(null);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: () => createGroup(orgId, groupName, scopeType, scopeId),
    onSuccess: () => {
      invalidateGroups();
      setGroupName("");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (gid: string) => deleteGroup(orgId, gid),
    onSuccess: invalidateGroups,
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ gid, memberEmail }: { gid: string; memberEmail: string }) => {
      const found = users?.find((u) => u.email === memberEmail);
      if (!found) throw new Error(t("members.userNotFound"));
      return addGroupMember(orgId, gid, found.id);
    },
    onSuccess: invalidateGroups,
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ gid, memberId }: { gid: string; memberId: string }) =>
      removeGroupMember(orgId, gid, memberId),
    onSuccess: invalidateGroups,
  });

  const bulkRemoveMemberMutation = useMutation({
    mutationFn: async ({ gid, memberIds }: { gid: string; memberIds: string[] }) => {
      for (const mid of memberIds.filter((id) => id !== me?.id)) {
        await removeGroupMember(orgId, gid, mid);
      }
    },
    onSuccess: (_, { gid }) => {
      setGroupMemberSelected((prev) => ({ ...prev, [gid]: new Set() }));
      invalidateGroups();
    },
  });

  const allSelectableIndices = (roles ?? [])
    .map((a, i) => (a.subject !== `user:${me?.id}` ? i : -1))
    .filter((i) => i >= 0);
  const allSelected =
    allSelectableIndices.length > 0 && allSelectableIndices.every((i) => selected.has(i));

  const rolesContent = (
    <Stack gap="sm">
      {rolesLoading && <Loader size="sm" />}
      {rolesError && <Alert color="red">{String(rolesError)}</Alert>}
      {roles?.length === 0 && (
        <Text size="sm" c="dimmed">
          {t("members.noRoles")}
        </Text>
      )}

      {canAssignRoles && (roles?.length ?? 0) > 1 && (
        <Group gap="xs">
          <Checkbox
            size="xs"
            checked={allSelected}
            indeterminate={!allSelected && selected.size > 0}
            onChange={() => {
              if (allSelected) {
                setSelected(new Set());
              } else {
                setSelected(new Set(allSelectableIndices));
              }
            }}
            label={
              <Text size="xs" c="dimmed">
                {t("members.selectAll")}
              </Text>
            }
          />
        </Group>
      )}

      {canAssignRoles && selected.size > 0 && (
        <Paper withBorder p="xs" radius="sm">
          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              {t("members.selected", { count: selected.size })}
            </Text>
            <Button
              size="compact-xs"
              color="red"
              variant="light"
              loading={bulkRevokeMutation.isPending}
              onClick={() => bulkRevokeMutation.mutate()}
            >
              {t("members.revokeAll")}
            </Button>
            <Select
              size="xs"
              placeholder={t("members.reassignPlaceholder")}
              data={ROLE_OPTIONS}
              value={bulkRole}
              onChange={setBulkRole}
              style={{ width: 120 }}
            />
            <Button
              size="compact-xs"
              disabled={!bulkRole}
              loading={bulkReassignMutation.isPending}
              onClick={() => bulkRole && bulkReassignMutation.mutate(bulkRole)}
            >
              {t("members.apply")}
            </Button>
          </Group>
        </Paper>
      )}

      {roles?.map((a, i) => {
        const isSelf = a.subject === `user:${me?.id}`;
        return (
          <Group key={i} justify="space-between" wrap="nowrap" opacity={isSelf ? 0.5 : 1}>
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              {canAssignRoles && (
                <Checkbox
                  size="xs"
                  disabled={isSelf}
                  checked={selected.has(i)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    setSelected(next);
                  }}
                />
              )}
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Group gap={4} wrap="nowrap">
                  <Text size="sm" fw={500} truncate>
                    {subjectLabel(a.subject)}
                  </Text>
                  {isSelf && (
                    <Text size="xs" c="dimmed">
                      {t("members.you")}
                    </Text>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {a.scope_type}:{a.scope_id.slice(0, 8)}…
                </Text>
              </Stack>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Badge color={ROLE_COLORS[a.role] ?? "gray"} size="sm">
                {t(`roles.${a.role}`, { defaultValue: a.role })}
              </Badge>
              {canAssignRoles && (
                <Button
                  size="compact-xs"
                  color="red"
                  variant="subtle"
                  loading={revokeMutation.isPending}
                  disabled={isSelf}
                  title={isSelf ? t("members.cannotRevokeSelf") : undefined}
                  onClick={() => revokeMutation.mutate(a)}
                >
                  ×
                </Button>
              )}
            </Group>
          </Group>
        );
      })}

      <Divider mt="xs" />

      {canAssignRoles && (
        <>
          <Text size="sm" fw={600}>
            {t("members.assignRole")}
          </Text>
          {showGroups && (
            <SegmentedControl
              size="xs"
              value={subjectType}
              onChange={(v) => setSubjectType(v as "user" | "group")}
              data={[
                { label: t("members.subjectType.user"), value: "user" },
                { label: t("members.subjectType.group"), value: "group" },
              ]}
            />
          )}
          {subjectType === "user" ? (
            <Autocomplete
              placeholder="user@example.com"
              data={users?.filter((u) => u.id !== me?.id).map((u) => u.email) ?? []}
              value={email}
              onChange={setEmail}
              size="xs"
            />
          ) : (
            <Select
              placeholder={t("members.selectGroup")}
              data={groups?.map((g) => ({ value: g.id, label: g.name })) ?? []}
              value={groupSubject}
              onChange={setGroupSubject}
              size="xs"
            />
          )}
          <Select
            placeholder={t("members.rolePlaceholder")}
            data={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
            size="xs"
          />
          {assignMutation.isError && (
            <Text size="xs" c="red">
              {String(assignMutation.error)}
            </Text>
          )}
          <Button
            size="xs"
            onClick={() => assignMutation.mutate()}
            loading={assignMutation.isPending}
            disabled={(!email && !groupSubject) || !role}
          >
            {t("members.assign")}
          </Button>
        </>
      )}
    </Stack>
  );

  const groupsContent = (
    <Stack gap="sm">
      {groups?.length === 0 && (
        <Text size="sm" c="dimmed">
          {t("members.noGroups")}
        </Text>
      )}
      <Accordion chevronPosition="left" variant="separated">
        {groups?.map((g) => (
          <Accordion.Item key={g.id} value={g.id}>
            <Accordion.Control>
              <Group justify="space-between" pr="xs">
                <Text size="sm" fw={500}>
                  {g.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("orgs.members", { count: g.member_ids.length })}
                </Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {canManageGroup(g) && g.member_ids.length > 1 && (
                  <Group gap="xs">
                    <Checkbox
                      size="xs"
                      checked={g.member_ids.every((mid) => groupMemberSelected[g.id]?.has(mid))}
                      indeterminate={
                        !g.member_ids.every((mid) => groupMemberSelected[g.id]?.has(mid)) &&
                        g.member_ids.some((mid) => groupMemberSelected[g.id]?.has(mid))
                      }
                      onChange={() => {
                        const current = groupMemberSelected[g.id] ?? new Set();
                        const allSelected = g.member_ids.every((mid) => current.has(mid));
                        setGroupMemberSelected((prev) => ({
                          ...prev,
                          [g.id]: allSelected ? new Set() : new Set(g.member_ids),
                        }));
                      }}
                      label={
                        <Text size="xs" c="dimmed">
                          {t("members.selectAll")}
                        </Text>
                      }
                    />
                  </Group>
                )}
                {canManageGroup(g) && (groupMemberSelected[g.id]?.size ?? 0) > 0 && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      {t("members.selected", { count: groupMemberSelected[g.id]?.size })}
                    </Text>
                    <Button
                      size="compact-xs"
                      color="red"
                      variant="light"
                      loading={bulkRemoveMemberMutation.isPending}
                      onClick={() =>
                        bulkRemoveMemberMutation.mutate({
                          gid: g.id,
                          memberIds: Array.from(groupMemberSelected[g.id] ?? []),
                        })
                      }
                    >
                      {t("members.removeSelected")}
                    </Button>
                  </Group>
                )}
                {g.member_ids.map((mid) => {
                  const isSelf = mid === me?.id;
                  return (
                    <Group
                      key={mid}
                      justify="space-between"
                      wrap="nowrap"
                      opacity={isSelf ? 0.5 : 1}
                    >
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        {canManageGroup(g) && (
                          <Checkbox
                            size="xs"
                            disabled={isSelf}
                            checked={groupMemberSelected[g.id]?.has(mid) ?? false}
                            onChange={() => {
                              const current = new Set(groupMemberSelected[g.id] ?? []);
                              if (current.has(mid)) current.delete(mid);
                              else current.add(mid);
                              setGroupMemberSelected((prev) => ({ ...prev, [g.id]: current }));
                            }}
                          />
                        )}
                        <Text size="xs" truncate>
                          {userById[mid] ?? mid}
                          {isSelf && (
                            <Text component="span" size="xs" c="dimmed">
                              {" "}
                              {t("members.you")}
                            </Text>
                          )}
                        </Text>
                      </Group>
                      {canManageGroup(g) && (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          loading={removeMemberMutation.isPending}
                          disabled={isSelf}
                          title={isSelf ? t("members.cannotRemoveSelf") : undefined}
                          onClick={() => removeMemberMutation.mutate({ gid: g.id, memberId: mid })}
                        >
                          ×
                        </Button>
                      )}
                    </Group>
                  );
                })}
                {canManageGroup(g) && (
                  <>
                    <Group gap="xs" mt={4}>
                      <Autocomplete
                        placeholder={t("members.addByEmail")}
                        data={users?.map((u) => u.email) ?? []}
                        value={groupMemberEmail[g.id] ?? ""}
                        onChange={(v) => setGroupMemberEmail((prev) => ({ ...prev, [g.id]: v }))}
                        size="xs"
                        style={{ flex: 1 }}
                      />
                      <Button
                        size="xs"
                        disabled={!groupMemberEmail[g.id]}
                        loading={addMemberMutation.isPending}
                        onClick={() => {
                          addMemberMutation.mutate({
                            gid: g.id,
                            memberEmail: groupMemberEmail[g.id] ?? "",
                          });
                          setGroupMemberEmail((prev) => ({ ...prev, [g.id]: "" }));
                        }}
                      >
                        {t("common.add")}
                      </Button>
                    </Group>
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      loading={deleteGroupMutation.isPending}
                      onClick={() => deleteGroupMutation.mutate(g.id)}
                    >
                      {t("members.deleteGroup")}
                    </Button>
                  </>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {canCreateGroup && (
        <>
          <Divider mt="xs" />
          <Text size="sm" fw={600}>
            {t("members.newGroup")}
          </Text>
          <Group gap="xs">
            <TextInput
              placeholder={t("members.groupNamePlaceholder")}
              value={groupName}
              onChange={(e) => setGroupName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && groupName && createGroupMutation.mutate()}
              size="xs"
              style={{ flex: 1 }}
            />
            <Button
              size="xs"
              disabled={!groupName}
              loading={createGroupMutation.isPending}
              onClick={() => createGroupMutation.mutate()}
            >
              {t("common.create")}
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t("members.title")}
      position="right"
      size="md"
      padding="md"
    >
      {showGroups ? (
        <Tabs defaultValue="roles">
          <Tabs.List>
            <Tabs.Tab value="roles">{t("members.tabRoles")}</Tabs.Tab>
            <Tabs.Tab value="groups">{t("members.tabGroups")}</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="roles" pt="md">
            {rolesContent}
          </Tabs.Panel>
          <Tabs.Panel value="groups" pt="md">
            {groupsContent}
          </Tabs.Panel>
        </Tabs>
      ) : (
        rolesContent
      )}
    </Drawer>
  );
}
