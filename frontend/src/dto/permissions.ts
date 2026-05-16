import { z } from "zod";

export const ROLES = ["viewer", "editor", "supervisor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  supervisor: 2,
  admin: 3,
};

const roleOrNull = z.enum(ROLES).nullable();

export const ScopeRolesSchema = z.object({
  org: roleOrNull,
  projects: z.record(z.string(), roleOrNull),
  subprojects: z.record(z.string(), roleOrNull),
  campaigns: z.record(z.string(), roleOrNull),
});

export type ScopeRoles = z.infer<typeof ScopeRolesSchema>;

export type ScopeType = "org" | "project" | "subproject" | "campaign";

export function getEffectiveRole(
  scopeType: ScopeType,
  scopeId: string,
  roles: ScopeRoles | undefined
): Role | null {
  if (!roles) return null;
  switch (scopeType) {
    case "org":
      return roles.org;
    case "project":
      return roles.projects[scopeId] ?? null;
    case "subproject":
      return roles.subprojects[scopeId] ?? null;
    case "campaign":
      return roles.campaigns[scopeId] ?? null;
  }
}

export const canManageMembers = (role: Role | null): boolean =>
  role != null && ROLE_RANK[role] >= ROLE_RANK["supervisor"];

export const canWrite = (role: Role | null): boolean =>
  role != null && ROLE_RANK[role] >= ROLE_RANK["editor"];

export const canRead = (role: Role | null): boolean => role != null;
