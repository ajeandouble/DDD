"""
Playground seed — full IAM + scopes + conversations fixture.

Run from backend/:
    uv run python scripts/seed_dev.py

Requires a running MongoDB and a .env file (defaults to .env).
Drops and recreates all data on each run.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.dev")

# ── bootstrap ────────────────────────────────────────────────────────────────

from src.shared.database import connect, disconnect, get_db
from src.iam.application.event_handlers import register_handlers as register_iam_handlers
from src.scopes.application.event_handlers import register_handlers as register_scopes_handlers
from src.iam.application.auth_service import AuthService
from src.iam.application.authorization_service import AuthorizationService
from src.iam.domain.models import Group, Tag
from src.iam.infrastructure.enforcer import init_enforcer
from src.iam.infrastructure.repositories import (
    MongoGroupRepository,
    MongoTagRepository,
    MongoUserRepository,
)
from src.scopes.application.commands import (
    CampaignCommandHandler,
    CreateCampaignCommand,
    CreateOrganizationCommand,
    CreateProjectCommand,
    CreateSubprojectCommand,
    OrganizationCommandHandler,
    ProjectCommandHandler,
    SubprojectCommandHandler,
)
from src.scopes.infrastructure.repositories import (
    MongoCampaignRepository,
    MongoOrganizationRepository,
    MongoProjectRepository,
    MongoSubprojectRepository,
)
from src.conversations.application.commands import (
    ConversationCommandHandler,
    CreateConversationCommand,
)
from src.conversations.infrastructure.repositories import MongoConversationRepository

# ── users ────────────────────────────────────────────────────────────────────

_PASSWORD = "abcd1234"

_USERS = [
    ("superadmin@ddd.dev", _PASSWORD, "superadmin — bypasses all checks"),
    ("alice@ddd.dev",      _PASSWORD, "org owner → admin at org (auto)"),
    ("bob@ddd.dev",        _PASSWORD, "supervisor at org"),
    ("carol@ddd.dev",      _PASSWORD, "editor at project"),
    ("dave@ddd.dev",       _PASSWORD, "viewer at campaign"),
    ("eve@ddd.dev",        _PASSWORD, "supervisor at subproject"),
    ("frank@ddd.dev",      _PASSWORD, "editor at org"),
    ("grace@ddd.dev",      _PASSWORD, "viewer at project"),
    ("henry@ddd.dev",      _PASSWORD, "editor at campaign"),
    ("ivan@ddd.dev",       _PASSWORD, "viewer at org"),
    ("judy@ddd.dev",       _PASSWORD, "no role — locked out of org"),
]

# ── main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    await connect()
    db = get_db()
    register_iam_handlers()
    register_scopes_handlers()

    # Wipe existing data so the script is idempotent via full reset
    collections = await db.list_collection_names()
    for col in collections:
        await db[col].drop()
    print("Dropped all collections.")

    enforcer = await init_enforcer(db)
    authz = AuthorizationService(enforcer, MongoGroupRepository(db), db)
    user_repo = MongoUserRepository(db)
    auth_svc = AuthService(user_repo)

    # ── users ────────────────────────────────────────────────────────────────
    for email, password, desc in _USERS:
        await auth_svc.register(email, password)
        print(f"  user  {email:30s}  ({desc})")

    users = {email: await user_repo.find_by_email(email) for email, _, _ in _USERS}
    superadmin = users["superadmin@ddd.dev"]
    alice  = users["alice@ddd.dev"]
    bob    = users["bob@ddd.dev"]
    carol  = users["carol@ddd.dev"]
    dave   = users["dave@ddd.dev"]
    eve    = users["eve@ddd.dev"]
    frank  = users["frank@ddd.dev"]
    grace  = users["grace@ddd.dev"]
    henry  = users["henry@ddd.dev"]
    ivan   = users["ivan@ddd.dev"]

    await authz.grant_superadmin(superadmin.id)
    print(f"\n  superadmin granted to {superadmin.email}")

    # ── scope hierarchy ──────────────────────────────────────────────────────
    org = await OrganizationCommandHandler(MongoOrganizationRepository(db)).create(
        CreateOrganizationCommand(name="Acme Corp", owner_id=alice.id)
    )
    project = await ProjectCommandHandler(
        MongoProjectRepository(db), MongoOrganizationRepository(db)
    ).create(CreateProjectCommand(
        name="Website Redesign", organization_id=org.id, requesting_user_id=alice.id,
    ))
    subproject = await SubprojectCommandHandler(
        MongoSubprojectRepository(db), MongoProjectRepository(db), MongoOrganizationRepository(db)
    ).create(CreateSubprojectCommand(
        name="Frontend", project_id=project.id, org_id=org.id, requesting_user_id=alice.id,
    ))
    campaign = await CampaignCommandHandler(
        MongoCampaignRepository(db), MongoSubprojectRepository(db), MongoOrganizationRepository(db)
    ).create(CreateCampaignCommand(
        name="Q1 2025 Launch", subproject_id=subproject.id, org_id=org.id,
        requesting_user_id=alice.id,
    ))

    oid = str(org.id)
    pid = str(project.id)
    sid = str(subproject.id)
    cid = str(campaign.id)

    print(f"\n  org        {oid}  Acme Corp")
    print(f"  project    {pid}  Website Redesign")
    print(f"  subproject {sid}  Frontend")
    print(f"  campaign   {cid}  Q1 2025 Launch")

    # ── individual role assignments ──────────────────────────────────────────
    await authz.assign_role(f"user:{bob.id}",   "supervisor", "org",        oid)
    await authz.assign_role(f"user:{carol.id}",  "editor",     "project",    pid)
    await authz.assign_role(f"user:{dave.id}",   "viewer",     "campaign",   cid)
    await authz.assign_role(f"user:{eve.id}",    "supervisor", "subproject", sid)
    await authz.assign_role(f"user:{frank.id}",  "editor",     "org",        oid)
    await authz.assign_role(f"user:{grace.id}",  "viewer",     "project",    pid)
    await authz.assign_role(f"user:{henry.id}",  "editor",     "campaign",   cid)
    await authz.assign_role(f"user:{ivan.id}",   "viewer",     "org",        oid)
    print("\n  individual roles assigned")

    # ── groups ───────────────────────────────────────────────────────────────
    group_repo = MongoGroupRepository(db)

    design_team = Group.create(name="Design Team", org_id=org.id)
    design_team.add_member(carol.id)
    design_team.add_member(grace.id)
    await group_repo.save(design_team)
    await authz.assign_role(f"group:{design_team.id}", "editor", "org", oid)
    print(f"  group Design Team ({design_team.id}) — carol, grace → editor@org")

    ops_team = Group.create(name="Ops Team", org_id=org.id)
    ops_team.add_member(bob.id)
    ops_team.add_member(eve.id)
    await group_repo.save(ops_team)
    await authz.assign_role(f"group:{ops_team.id}", "supervisor", "org", oid)
    print(f"  group Ops Team    ({ops_team.id}) — bob, eve → supervisor@org")

    # ── tags ─────────────────────────────────────────────────────────────────
    tag_repo = MongoTagRepository(db)
    tags = {}
    for name in ("urgent", "design", "technical", "review", "blocked"):
        t = Tag.create(name=name, org_id=org.id)
        await tag_repo.save(t)
        tags[name] = t
    print(f"\n  tags: {', '.join(tags)}")

    # ── conversations ────────────────────────────────────────────────────────
    conv = ConversationCommandHandler(MongoConversationRepository(db))

    convs = [
        ("Q1 Strategy",              alice.id,  "organization", None,        ["urgent"]),
        ("Hiring Plan",              frank.id,  "organization", None,        ["review"]),
        ("Tech Stack Decision",      bob.id,    "project",      project.id,  ["technical"]),
        ("API Contract Review",      carol.id,  "project",      project.id,  ["review", "technical"]),
        ("Component Library",        carol.id,  "subproject",   subproject.id, ["design", "technical"]),
        ("Accessibility Audit",      grace.id,  "subproject",   subproject.id, ["blocked", "design"]),
        ("Launch Checklist",         henry.id,  "campaign",     campaign.id, ["urgent"]),
        ("Post-launch Retrospective",eve.id,    "campaign",     campaign.id, ["review"]),
    ]

    for title, creator, scope_type, scope_id, tag_names in convs:
        await conv.create(CreateConversationCommand(
            title=title,
            content=f"Seeded conversation: {title}.",
            created_by=creator,
            organization_id=org.id,
            scope_id=scope_id,
            scope_type=scope_type,
            tag_ids=[tags[n].id for n in tag_names],
        ))
    print(f"  {len(convs)} conversations created")

    # ── summary ──────────────────────────────────────────────────────────────
    print("\n" + "─" * 60)
    print(f"Seed complete. Password for all accounts: {_PASSWORD}")
    for email, _, desc in _USERS:
        print(f"  {email:30s}  {desc}")
    print(f"\nOrg ID: {oid}")

    await disconnect()


asyncio.run(main())
