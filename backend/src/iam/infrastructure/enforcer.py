import casbin
from casbin.persist import Adapter
from motor.motor_asyncio import AsyncIOMotorDatabase

_enforcer: casbin.Enforcer | None = None

_RBAC_MODEL = """
[request_definition]
r = sub, dom, act

[policy_definition]
p = sub, dom, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && (p.dom == "*" || r.dom == p.dom) && (p.act == "*" || r.act == p.act)
"""

# Static role policies — never persisted, always seeded in memory at startup
_ROLE_POLICIES = [
    ["admin", "*", "*"],
    ["supervisor", "*", "read"],
    ["supervisor", "*", "write"],
    ["supervisor", "*", "delete"],
    ["supervisor", "*", "manage_members"],
    ["editor", "*", "read"],
    ["editor", "*", "write"],
    ["viewer", "*", "read"],
]


class _NoopAdapter(Adapter):
    def load_policy(self, model) -> None:
        pass

    def save_policy(self, model) -> bool:
        return True

    def add_policy(self, sec, ptype, rule) -> None:
        pass

    def remove_policy(self, sec, ptype, rule) -> None:
        pass

    def remove_filtered_policy(self, sec, ptype, field_index, *field_values) -> None:
        pass


async def init_enforcer(db: AsyncIOMotorDatabase) -> casbin.Enforcer:
    global _enforcer

    m = casbin.Model()
    m.load_model_from_text(_RBAC_MODEL)

    e = casbin.Enforcer(m, _NoopAdapter())
    e.auto_save = False

    for policy in _ROLE_POLICIES:
        e.add_policy(*policy)

    # Load dynamic g rules from MongoDB
    col = db["casbin_rules"]
    async for doc in col.find({}):
        e.add_grouping_policy(*doc["rule"])

    # Migrate any org owners who don't yet have an admin rule
    await _migrate_org_owners(db, e)

    _enforcer = e
    return e


async def _migrate_org_owners(db: AsyncIOMotorDatabase, e: casbin.Enforcer) -> None:
    col = db["casbin_rules"]
    async for org in db["scopes_organizations"].find({}, {"_id": 1, "owner_id": 1}):
        org_id = org["_id"]
        owner_id = org["owner_id"]
        sub = f"user:{owner_id}"
        domain = f"org:{org_id}"
        rule = [sub, "admin", domain]
        existing = e.get_roles_for_user_in_domain(sub, domain)
        if "admin" not in existing:
            e.add_grouping_policy(*rule)
            await col.update_one({"rule": rule}, {"$setOnInsert": {"rule": rule}}, upsert=True)


def get_enforcer() -> casbin.Enforcer:
    if _enforcer is None:
        raise RuntimeError("Enforcer not initialised — call init_enforcer() first")
    return _enforcer
