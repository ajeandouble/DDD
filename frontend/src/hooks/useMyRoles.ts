import { useQuery } from "@tanstack/react-query";
import { getMyRoles } from "../lib/api";
import { getEffectiveRole, canManageMembers, type ScopeType, type Role } from "../dto/permissions";

export function useMyRoles(orgId: string | undefined) {
  return useQuery({
    queryKey: ["my-roles", orgId],
    queryFn: () => getMyRoles(orgId!),
    enabled: !!orgId,
  });
}

export function useCanManageMembers(
  orgId: string | undefined,
  scopeType: ScopeType,
  scopeId: string | undefined
): boolean {
  const { data } = useMyRoles(orgId);
  if (!data || !scopeId) return false;
  const role: Role | null = getEffectiveRole(scopeType, scopeId, data);
  return canManageMembers(role);
}
