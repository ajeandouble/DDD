from uuid import UUID

import casbin
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.iam.domain.events import OrgMemberAdded, OrgMemberRemoved
from src.iam.domain.repositories import GroupRepository
from src.shared.events import publish


class NotAuthorized(Exception):
    pass


_ROLE_RANK: dict[str, int] = {
    "viewer": 0,
    "editor": 1,
    "supervisor": 2,
    "admin": 3,
}


class AuthorizationService:
    def __init__(
        self,
        enforcer: casbin.Enforcer,
        group_repo: GroupRepository,
        db: AsyncIOMotorDatabase,
    ) -> None:
        self._e = enforcer
        self._groups = group_repo
        self._col = db["casbin_rules"]

    # -----------------------------------------------------------------
    # Authorization check — walks up the scope lineage
    # -----------------------------------------------------------------

    async def can_do(
        self,
        subject: str,
        action: str,
        scope_type: str,
        scope_id: str,
        org_id: str | None = None,
    ) -> bool:
        # Superadmin short-circuit — granted via grant_superadmin()
        if "superadmin" in self._e.get_roles_for_user_in_domain(subject, "platform"):
            return True

        subjects = [subject]

        # Expand user into their groups within the org
        if subject.startswith("user:") and org_id:
            try:
                uid = UUID(subject[5:])
                groups = await self._groups.find_by_member_in_org(uid, UUID(org_id))
                subjects.extend(f"group:{g.id}" for g in groups)
            except (ValueError, AttributeError):
                pass

        domain = f"{scope_type}:{scope_id}"
        visited: set[str] = set()

        while domain and domain not in visited:
            visited.add(domain)
            for sub in subjects:
                if self._e.enforce(sub, domain, action):
                    return True
            parents = self._e.get_roles_for_user_in_domain(domain, "_lineage")
            domain = parents[0] if parents else None

        return False

    # -----------------------------------------------------------------
    # Delegation check — "can granter assign/revoke this role at this scope?"
    # -----------------------------------------------------------------

    async def can_assign(
        self,
        granter: str,
        role: str,
        scope_type: str,
        scope_id: str,
        org_id: str | None = None,
    ) -> bool:
        # Superadmin can assign any role anywhere
        if "superadmin" in self._e.get_roles_for_user_in_domain(granter, "platform"):
            return True
        # Must have manage_members at the target scope (or a parent)
        if not await self.can_do(granter, "manage_members", scope_type, scope_id, org_id=org_id):
            return False
        # Role ceiling: granter can only grant roles they themselves hold or below
        granter_role = await self._highest_role(granter, scope_type, scope_id, org_id)
        if granter_role is None:
            return False
        return _ROLE_RANK.get(role, -1) <= _ROLE_RANK[granter_role]

    async def effective_role(
        self, subject: str, scope_type: str, scope_id: str, org_id: str | None = None
    ) -> str | None:
        """Public alias for _highest_role."""
        return await self._highest_role(subject, scope_type, scope_id, org_id=org_id)

    async def _highest_role(
        self,
        subject: str,
        scope_type: str,
        scope_id: str,
        org_id: str | None = None,
    ) -> str | None:
        """Return the highest-ranked role subject holds at scope_type:scope_id or any ancestor."""
        if self.is_superadmin(subject):
            return "admin"

        subjects = [subject]
        if subject.startswith("user:") and org_id:
            try:
                uid = UUID(subject[5:])
                groups = await self._groups.find_by_member_in_org(uid, UUID(org_id))
                subjects.extend(f"group:{g.id}" for g in groups)
            except (ValueError, AttributeError):
                pass

        best = -1
        domain: str | None = f"{scope_type}:{scope_id}"
        visited: set[str] = set()

        while domain and domain not in visited:
            visited.add(domain)
            for sub in subjects:
                for r in self._e.get_roles_for_user_in_domain(sub, domain):
                    best = max(best, _ROLE_RANK.get(r, -1))
            parents = self._e.get_roles_for_user_in_domain(domain, "_lineage")
            domain = parents[0] if parents else None

        if best < 0:
            return None
        return next(r for r, rank in _ROLE_RANK.items() if rank == best)

    # -----------------------------------------------------------------
    # Role assignment
    # -----------------------------------------------------------------

    async def assign_role(
        self, subject: str, role: str, scope_type: str, scope_id: str, org_id: str | None = None
    ) -> None:
        domain = f"{scope_type}:{scope_id}"
        self._e.add_grouping_policy(subject, role, domain)
        await self._save_g_rule(subject, role, domain)
        if subject.startswith("user:"):
            effective_org = scope_id if scope_type == "org" else org_id
            if effective_org:
                await publish(OrgMemberAdded(org_id=UUID(effective_org), user_id=UUID(subject[5:])))

    async def revoke_role(
        self,
        subject: str,
        role: str,
        scope_type: str,
        scope_id: str,
        org_owner_id: UUID | None = None,
    ) -> None:
        if role == "admin" and scope_type == "org" and org_owner_id:
            if subject == f"user:{org_owner_id}":
                raise NotAuthorized("Cannot revoke admin from the org owner")
        domain = f"{scope_type}:{scope_id}"
        self._e.remove_grouping_policy(subject, role, domain)
        await self._delete_g_rule(subject, role, domain)
        if scope_type == "org" and subject.startswith("user:"):
            await publish(OrgMemberRemoved(org_id=UUID(scope_id), user_id=UUID(subject[5:])))

    # -----------------------------------------------------------------
    # Seed helpers — called when scopes are created
    # -----------------------------------------------------------------

    def is_superadmin(self, subject: str) -> bool:
        return "superadmin" in self._e.get_roles_for_user_in_domain(subject, "platform")

    def direct_roles_at(self, subject: str, scope_type: str, scope_id: str) -> list[str]:
        """Roles assigned directly to subject at this scope — no lineage traversal."""
        return self._e.get_roles_for_user_in_domain(subject, f"{scope_type}:{scope_id}")

    async def _subjects_for(self, subject: str, org_id: str) -> list[str]:
        """Expand subject into itself + any groups within the org."""
        subjects = [subject]
        if subject.startswith("user:"):
            try:
                uid = UUID(subject[5:])
                groups = await self._groups.find_by_member_in_org(uid, UUID(org_id))
                subjects.extend(f"group:{g.id}" for g in groups)
            except (ValueError, AttributeError):
                pass
        return subjects

    def _scope_domains(self, subjects: list[str]) -> set[str]:
        """All Casbin domains where any subject has a direct role (excludes _lineage domain)."""
        domains: set[str] = set()
        for sub in subjects:
            for rule in self._e.get_filtered_grouping_policy(0, sub):
                if len(rule) >= 3:
                    domains.add(rule[2])  # rule = [subject, role, domain]
        return domains

    async def accessible_project_ids(self, subject: str, org_id: str) -> set[UUID] | None:
        """
        Project IDs the subject can see in this org.
        Returns None when all projects are accessible (any org-level role, or superadmin).
        """
        if self.is_superadmin(subject):
            return None
        subjects = await self._subjects_for(subject, org_id)
        domains = self._scope_domains(subjects)
        # any org-level role (viewer+) sees all projects
        org_domain = f"org:{org_id}"
        if org_domain in domains:
            org_roles = [
                r for s in subjects for r in self._e.get_roles_for_user_in_domain(s, org_domain)
            ]
            if org_roles:
                return None
        # Trace each domain up to a project ID
        accessible: set[UUID] = set()
        for domain in domains:
            if domain.startswith("project:"):
                accessible.add(UUID(domain[8:]))
            elif domain.startswith("subproject:"):
                for parent in self._e.get_roles_for_user_in_domain(domain, "_lineage"):
                    if parent.startswith("project:"):
                        accessible.add(UUID(parent[8:]))
            elif domain.startswith("campaign:"):
                for parent in self._e.get_roles_for_user_in_domain(domain, "_lineage"):
                    if parent.startswith("project:"):
                        accessible.add(UUID(parent[8:]))
                    elif parent.startswith("subproject:"):
                        for gp in self._e.get_roles_for_user_in_domain(parent, "_lineage"):
                            if gp.startswith("project:"):
                                accessible.add(UUID(gp[8:]))
        return accessible

    async def accessible_subproject_ids(
        self, subject: str, project_id: str, org_id: str
    ) -> set[UUID] | None:
        """
        Subproject IDs the subject can see under this project.
        Returns None when all are accessible (any org or project role, or superadmin).
        """
        if self.is_superadmin(subject):
            return None
        subjects = await self._subjects_for(subject, org_id)
        domains = self._scope_domains(subjects)
        # any org or project role (viewer+) sees all subprojects
        for scope in (f"org:{org_id}", f"project:{project_id}"):
            if scope in domains:
                roles = [
                    r for s in subjects for r in self._e.get_roles_for_user_in_domain(s, scope)
                ]
                if roles:
                    return None
        # Trace domains to subproject IDs under this project
        accessible: set[UUID] = set()
        for domain in domains:
            if domain.startswith("subproject:"):
                # Check it belongs to this project
                for parent in self._e.get_roles_for_user_in_domain(domain, "_lineage"):
                    if parent == f"project:{project_id}":
                        accessible.add(UUID(domain[12:]))
            elif domain.startswith("campaign:"):
                for parent in self._e.get_roles_for_user_in_domain(domain, "_lineage"):
                    if parent.startswith("subproject:"):
                        for gp in self._e.get_roles_for_user_in_domain(parent, "_lineage"):
                            if gp == f"project:{project_id}":
                                accessible.add(UUID(parent[12:]))
        return accessible

    async def has_any_role_at(
        self,
        subject: str,
        scope_type: str,
        scope_id: str,
        org_id: str | None = None,
    ) -> bool:
        """True if subject (or any of their groups) has any role directly at this scope."""
        subjects = [subject]
        if subject.startswith("user:") and org_id:
            try:
                uid = UUID(subject[5:])
                groups = await self._groups.find_by_member_in_org(uid, UUID(org_id))
                subjects.extend(f"group:{g.id}" for g in groups)
            except (ValueError, AttributeError):
                pass
        domain = f"{scope_type}:{scope_id}"
        return any(bool(self._e.get_roles_for_user_in_domain(s, domain)) for s in subjects)

    async def has_elevated_role_anywhere(self, subject: str) -> bool:
        """True if subject holds supervisor or admin in any scope."""
        doc = await self._col.find_one(
            {"rule.0": subject, "rule.1": {"$in": ["supervisor", "admin"]}}
        )
        return doc is not None

    async def list_roles_for_domains(self, domains: list[str]) -> list[tuple[str, str, str]]:
        """Return (subject, role, domain) for all assignments in the given domains."""
        results: list[tuple[str, str, str]] = []
        async for doc in self._col.find({"rule.2": {"$in": domains}}):
            rule = doc["rule"]
            if len(rule) == 3:
                results.append((rule[0], rule[1], rule[2]))
        return results

    async def grant_superadmin(self, user_id: UUID) -> None:
        """Grant platform-level superadmin — bypasses all scope checks."""
        sub = f"user:{user_id}"
        self._e.add_grouping_policy(sub, "superadmin", "platform")
        await self._save_g_rule(sub, "superadmin", "platform")

    async def seed_org(self, org_id: UUID, owner_id: UUID) -> None:
        """Grant admin to the org owner at org scope."""
        await self.assign_role(f"user:{owner_id}", "admin", "org", str(org_id))

    async def register_lineage(
        self, child_type: str, child_id: UUID, parent_type: str, parent_id: UUID
    ) -> None:
        """Store the parent→child scope relationship in the _lineage domain."""
        child = f"{child_type}:{child_id}"
        parent = f"{parent_type}:{parent_id}"
        self._e.add_grouping_policy(child, parent, "_lineage")
        await self._save_g_rule(child, parent, "_lineage")

    # -----------------------------------------------------------------
    # Persistence helpers
    # -----------------------------------------------------------------

    async def _save_g_rule(self, *parts: str) -> None:
        rule = list(parts)
        await self._col.update_one({"rule": rule}, {"$setOnInsert": {"rule": rule}}, upsert=True)

    async def _delete_g_rule(self, *parts: str) -> None:
        await self._col.delete_one({"rule": list(parts)})
