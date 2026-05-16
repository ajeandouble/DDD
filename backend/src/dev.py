"""
Dev-only seed endpoint.  POST /dev/seed  creates a fixed set of test fixtures.
Safe to call multiple times — skips creation if alice@ddd.dev already exists.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/dev", tags=["dev"])


class SeedCredentials(BaseModel):
    email: str
    password: str
    role: str


class SeedResult(BaseModel):
    status: str
    credentials: list[SeedCredentials]
    org_id: str
    project_id: str
    subproject_id: str
    campaign_id: str


# (email, password, description)
_USERS = [
    ("superadmin@ddd.dev", "SuperAdmin123!", "superadmin — bypasses all checks"),
    ("alice@ddd.dev",      "Alice123!",      "org owner → admin at org (auto)"),
    ("bob@ddd.dev",        "Bob123!",        "supervisor at org"),
    ("carol@ddd.dev",      "Carol123!",      "editor at project"),
    ("dave@ddd.dev",       "Dave123!",       "viewer at campaign"),
    ("eve@ddd.dev",        "Eve123!",        "supervisor at subproject"),
    ("frank@ddd.dev",      "Frank123!",      "editor at org"),
    ("grace@ddd.dev",      "Grace123!",      "viewer at project"),
    ("henry@ddd.dev",      "Henry123!",      "editor at campaign"),
    ("ivan@ddd.dev",       "Ivan123!",       "viewer at org"),
    ("judy@ddd.dev",       "Judy123!",       "no role — locked out of org"),
]


@router.post("/seed", response_model=SeedResult)
async def seed():
    from src.conversations.application.commands import (
        ConversationCommandHandler,
        CreateConversationCommand,
    )
    from src.conversations.infrastructure.repositories import MongoConversationRepository
    from src.iam.application.auth_service import AuthError, AuthService
    from src.iam.application.authorization_service import AuthorizationService
    from src.iam.domain.models import Group, Tag
    from src.iam.infrastructure.enforcer import get_enforcer
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
    from src.shared.database import get_db

    db = get_db()
    user_repo = MongoUserRepository(db)

    # Idempotency: skip if already seeded
    existing = await user_repo.find_by_email("alice@ddd.dev")
    if existing is not None:
        org = await db["scopes_organizations"].find_one({"owner_id": str(existing.id)})
        if org:
            project = await db["scopes_projects"].find_one({"organization_id": str(org["_id"])})
            subproject = (
                await db["scopes_subprojects"].find_one({"project_id": str(project["_id"])})
                if project
                else None
            )
            campaign = (
                await db["scopes_campaigns"].find_one({"subproject_id": str(subproject["_id"])})
                if subproject
                else None
            )
            return SeedResult(
                status="already_seeded",
                credentials=[SeedCredentials(email=e, password=p, role=r) for e, p, r in _USERS],
                org_id=str(org["_id"]),
                project_id=str(project["_id"]) if project else "",
                subproject_id=str(subproject["_id"]) if subproject else "",
                campaign_id=str(campaign["_id"]) if campaign else "",
            )

    # --- Create users ---
    auth_svc = AuthService(user_repo)
    for email, password, _ in _USERS:
        try:
            await auth_svc.register(email, password)
        except AuthError:
            pass

    users = {email: await user_repo.find_by_email(email) for email, _, _ in _USERS}
    superadmin_user = users["superadmin@ddd.dev"]
    alice  = users["alice@ddd.dev"]
    bob    = users["bob@ddd.dev"]
    carol  = users["carol@ddd.dev"]
    dave   = users["dave@ddd.dev"]
    eve    = users["eve@ddd.dev"]
    frank  = users["frank@ddd.dev"]
    grace  = users["grace@ddd.dev"]
    henry  = users["henry@ddd.dev"]
    ivan   = users["ivan@ddd.dev"]

    # --- Authz service ---
    authz = AuthorizationService(get_enforcer(), MongoGroupRepository(db), db)
    await authz.grant_superadmin(superadmin_user.id)

    # --- Create org / hierarchy (events fire automatically → lineage + seed_org) ---
    org = await OrganizationCommandHandler(MongoOrganizationRepository(db)).create(
        CreateOrganizationCommand(name="Acme Corp", owner_id=alice.id)
    )
    project = await ProjectCommandHandler(
        MongoProjectRepository(db), MongoOrganizationRepository(db)
    ).create(
        CreateProjectCommand(
            name="Website Redesign",
            organization_id=org.id,
            requesting_user_id=alice.id,
        )
    )
    subproject = await SubprojectCommandHandler(
        MongoSubprojectRepository(db), MongoProjectRepository(db), MongoOrganizationRepository(db)
    ).create(
        CreateSubprojectCommand(
            name="Frontend",
            project_id=project.id,
            org_id=org.id,
            requesting_user_id=alice.id,
        )
    )
    campaign = await CampaignCommandHandler(
        MongoCampaignRepository(db), MongoSubprojectRepository(db), MongoOrganizationRepository(db)
    ).create(
        CreateCampaignCommand(
            name="Q1 2025 Launch",
            subproject_id=subproject.id,
            org_id=org.id,
            requesting_user_id=alice.id,
        )
    )

    # --- Assign individual roles ---
    oid  = str(org.id)
    pid  = str(project.id)
    sid  = str(subproject.id)
    cid  = str(campaign.id)

    await authz.assign_role(f"user:{bob.id}",   "supervisor", "org",        oid)
    await authz.assign_role(f"user:{carol.id}",  "editor",     "project",    pid)
    await authz.assign_role(f"user:{dave.id}",   "viewer",     "campaign",   cid)
    await authz.assign_role(f"user:{eve.id}",    "supervisor", "subproject", sid)
    await authz.assign_role(f"user:{frank.id}",  "editor",     "org",        oid)
    await authz.assign_role(f"user:{grace.id}",  "viewer",     "project",    pid)
    await authz.assign_role(f"user:{henry.id}",  "editor",     "campaign",   cid)
    await authz.assign_role(f"user:{ivan.id}",   "viewer",     "org",        oid)

    # --- Create groups ---
    group_repo = MongoGroupRepository(db)

    design_team = Group.create(name="Design Team", org_id=org.id)
    design_team.add_member(carol.id)
    design_team.add_member(grace.id)
    await group_repo.save(design_team)
    await authz.assign_role(f"group:{design_team.id}", "editor", "org", oid)

    ops_team = Group.create(name="Ops Team", org_id=org.id)
    ops_team.add_member(bob.id)
    ops_team.add_member(eve.id)
    await group_repo.save(ops_team)
    await authz.assign_role(f"group:{ops_team.id}", "supervisor", "org", oid)

    # --- Create tags ---
    tag_repo = MongoTagRepository(db)
    tags = {}
    for name in ("urgent", "design", "technical", "review", "blocked"):
        t = Tag.create(name=name, org_id=org.id)
        await tag_repo.save(t)
        tags[name] = t

    # --- Create conversations at each scope level ---
    conv = ConversationCommandHandler(MongoConversationRepository(db))

    await conv.create(CreateConversationCommand(
        title="Q1 Strategy",
        content="Aligning on company direction for Q1. Key topics: hiring, product roadmap, budget.",
        created_by=alice.id, organization_id=org.id, scope_type="organization",
        tag_ids=[tags["urgent"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="Hiring Plan",
        content="We need 3 senior engineers and 1 designer by end of Q1.",
        created_by=frank.id, organization_id=org.id, scope_type="organization",
        tag_ids=[tags["review"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="Tech Stack Decision",
        content="Evaluating React vs Vue for the frontend rewrite. Performance benchmarks attached.",
        created_by=bob.id, organization_id=org.id, scope_id=project.id, scope_type="project",
        tag_ids=[tags["technical"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="API Contract Review",
        content="Reviewing the REST contract for the new auth service before handoff.",
        created_by=carol.id, organization_id=org.id, scope_id=project.id, scope_type="project",
        tag_ids=[tags["review"].id, tags["technical"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="Component Library",
        content="Proposing Mantine as our component library. Covers accessibility and dark mode.",
        created_by=carol.id, organization_id=org.id, scope_id=subproject.id, scope_type="subproject",
        tag_ids=[tags["design"].id, tags["technical"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="Accessibility Audit",
        content="WCAG 2.1 AA compliance pass required before launch. Flagging 4 failing components.",
        created_by=grace.id, organization_id=org.id, scope_id=subproject.id, scope_type="subproject",
        tag_ids=[tags["blocked"].id, tags["design"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="Launch Checklist",
        content="Pre-launch checklist: QA sign-off, CDN config, monitoring alerts, rollback plan.",
        created_by=henry.id, organization_id=org.id, scope_id=campaign.id, scope_type="campaign",
        tag_ids=[tags["urgent"].id],
    ))
    await conv.create(CreateConversationCommand(
        title="Post-launch Retrospective",
        content="What went well, what didn't. Keeping this open for async comments for 2 weeks.",
        created_by=eve.id, organization_id=org.id, scope_id=campaign.id, scope_type="campaign",
        tag_ids=[tags["review"].id],
    ))

    return SeedResult(
        status="seeded",
        credentials=[SeedCredentials(email=e, password=p, role=r) for e, p, r in _USERS],
        org_id=oid,
        project_id=pid,
        subproject_id=sid,
        campaign_id=cid,
    )
