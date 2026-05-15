from uuid import UUID

import casbin
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.iam.domain.repositories import GroupRepository


class NotAuthorized(Exception):
    pass


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
    # Role assignment
    # -----------------------------------------------------------------

    async def assign_role(self, subject: str, role: str, scope_type: str, scope_id: str) -> None:
        domain = f"{scope_type}:{scope_id}"
        self._e.add_grouping_policy(subject, role, domain)
        await self._save_g_rule(subject, role, domain)

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

    # -----------------------------------------------------------------
    # Seed helpers — called when scopes are created
    # -----------------------------------------------------------------

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
