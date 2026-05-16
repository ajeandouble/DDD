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
} from "../lib/api";
import type { RoleAssignment } from "../dto/iam";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

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

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
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

  const userById = Object.fromEntries(users?.map((u) => [u.id, u.email]) ?? []);
  const groupById = Object.fromEntries(groups?.map((g) => [g.id, g.name]) ?? []);

  const subjectLabel = (subject: string) => {
    if (subject.startsWith("user:")) return userById[subject.slice(5)] ?? subject;
    if (subject.startsWith("group:")) {
      const name = groupById[subject.slice(6)];
      return name ? `Group: ${name}` : subject;
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
      if (!role) throw new Error("Pick a role");
      if (subjectType === "group") {
        if (!groupSubject) throw new Error("Pick a group");
        return assignRole(orgId, {
          subject: `group:${groupSubject}`,
          role,
          scope_type: scopeType,
          scope_id: scopeId,
        });
      }
      const found = users?.find((u) => u.email === email);
      if (!found) throw new Error("Pick a valid user");
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
    [roles, selected],
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
    mutationFn: () => createGroup(orgId, groupName),
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
      if (!found) throw new Error("User not found");
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
    allSelectableIndices.length > 0 &&
    allSelectableIndices.every((i) => selected.has(i));

  const rolesContent = (
    <Stack gap="sm">
      {rolesLoading && <Loader size="sm" />}
      {rolesError && <Alert color="red">{String(rolesError)}</Alert>}
      {roles?.length === 0 && (
        <Text size="sm" c="dimmed">
          No role assignments at this scope.
        </Text>
      )}

      {/* Select-all row */}
      {(roles?.length ?? 0) > 1 && (
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
            label={<Text size="xs" c="dimmed">Select all</Text>}
          />
        </Group>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Paper withBorder p="xs" radius="sm">
          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">{selected.size} selected</Text>
            <Button
              size="compact-xs"
              color="red"
              variant="light"
              loading={bulkRevokeMutation.isPending}
              onClick={() => bulkRevokeMutation.mutate()}
            >
              Revoke all
            </Button>
            <Select
              size="xs"
              placeholder="Reassign to…"
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
              Apply
            </Button>
          </Group>
        </Paper>
      )}

      {roles?.map((a, i) => {
        const isSelf = a.subject === `user:${me?.id}`;
        return (
          <Group key={i} justify="space-between" wrap="nowrap" opacity={isSelf ? 0.5 : 1}>
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
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
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Group gap={4} wrap="nowrap">
                  <Text size="sm" fw={500} truncate>
                    {subjectLabel(a.subject)}
                  </Text>
                  {isSelf && (
                    <Text size="xs" c="dimmed">
                      (you)
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
                {a.role}
              </Badge>
              <Button
                size="compact-xs"
                color="red"
                variant="subtle"
                loading={revokeMutation.isPending}
                disabled={isSelf}
                title={isSelf ? "Cannot revoke your own role" : undefined}
                onClick={() => revokeMutation.mutate(a)}
              >
                ×
              </Button>
            </Group>
          </Group>
        );
      })}

      <Divider mt="xs" />

      <Text size="sm" fw={600}>
        Assign role
      </Text>
      {showGroups && (
        <SegmentedControl
          size="xs"
          value={subjectType}
          onChange={(v) => setSubjectType(v as "user" | "group")}
          data={[
            { label: "User", value: "user" },
            { label: "Group", value: "group" },
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
          placeholder="Select group"
          data={groups?.map((g) => ({ value: g.id, label: g.name })) ?? []}
          value={groupSubject}
          onChange={setGroupSubject}
          size="xs"
        />
      )}
      <Select
        placeholder="Role"
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
        Assign
      </Button>
    </Stack>
  );

  const groupsContent = (
    <Stack gap="sm">
      {groups?.length === 0 && (
        <Text size="sm" c="dimmed">
          No groups yet.
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
                  {g.member_ids.length} member{g.member_ids.length !== 1 ? "s" : ""}
                </Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {g.member_ids.length > 1 && (
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
                      label={<Text size="xs" c="dimmed">Select all</Text>}
                    />
                  </Group>
                )}
                {(groupMemberSelected[g.id]?.size ?? 0) > 0 && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">{groupMemberSelected[g.id]?.size} selected</Text>
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
                      Remove selected
                    </Button>
                  </Group>
                )}
                {g.member_ids.map((mid) => {
                  const isSelf = mid === me?.id;
                  return (
                    <Group key={mid} justify="space-between" wrap="nowrap" opacity={isSelf ? 0.5 : 1}>
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
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
                        <Text size="xs" truncate>
                          {userById[mid] ?? mid}
                          {isSelf && (
                            <Text component="span" size="xs" c="dimmed"> (you)</Text>
                          )}
                        </Text>
                      </Group>
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color="red"
                        loading={removeMemberMutation.isPending}
                        disabled={isSelf}
                        title={isSelf ? "Cannot remove yourself from a group" : undefined}
                        onClick={() => removeMemberMutation.mutate({ gid: g.id, memberId: mid })}
                      >
                        ×
                      </Button>
                    </Group>
                  );
                })}
                <Group gap="xs" mt={4}>
                  <Autocomplete
                    placeholder="Add by email"
                    data={users?.map((u) => u.email) ?? []}
                    value={groupMemberEmail[g.id] ?? ""}
                    onChange={(v) =>
                      setGroupMemberEmail((prev) => ({ ...prev, [g.id]: v }))
                    }
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
                    Add
                  </Button>
                </Group>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  loading={deleteGroupMutation.isPending}
                  onClick={() => deleteGroupMutation.mutate(g.id)}
                >
                  Delete group
                </Button>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      <Divider mt="xs" />

      <Text size="sm" fw={600}>
        New group
      </Text>
      <Group gap="xs">
        <TextInput
          placeholder="Group name"
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
          Create
        </Button>
      </Group>
    </Stack>
  );

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Members & Roles"
      position="right"
      size="md"
      padding="md"
    >
      {showGroups ? (
        <Tabs defaultValue="roles">
          <Tabs.List>
            <Tabs.Tab value="roles">Roles</Tabs.Tab>
            <Tabs.Tab value="groups">Groups</Tabs.Tab>
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
