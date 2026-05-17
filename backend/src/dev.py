"""
Dev-only seed endpoint.  POST /dev/seed  creates a fixed set of test fixtures.
Drops all data and re-creates from scratch every time.
"""

import random
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


_USERS = [
    ("superadmin@ddd.dev", "abcd1234", "superadmin — bypasses all checks"),
    ("alice@ddd.dev",      "abcd1234", "org owner → admin at org (auto)"),
    ("bob@ddd.dev",        "abcd1234", "supervisor at org"),
    ("carol@ddd.dev",      "abcd1234", "editor at project"),
    ("dave@ddd.dev",       "abcd1234", "viewer at campaign"),
    ("eve@ddd.dev",        "abcd1234", "supervisor at subproject"),
    ("frank@ddd.dev",      "abcd1234", "editor at org"),
    ("grace@ddd.dev",      "abcd1234", "viewer at project"),
    ("henry@ddd.dev",      "abcd1234", "editor at campaign"),
    ("ivan@ddd.dev",       "abcd1234", "viewer at org"),
    ("judy@ddd.dev",       "abcd1234", "no role — locked out of org"),
]

_TOPICS = [
    "Customer interview", "Product feedback", "Sales call", "Support escalation",
    "Team standup", "Design review", "Sprint planning", "Bug triage",
    "Onboarding session", "Contract negotiation", "Partnership call",
    "User research", "Investor update", "Board meeting", "All-hands",
    "Post-mortem", "Stakeholder sync", "Quarterly review", "Feature walkthrough",
    "Demo call",
]

_AGENTS = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry"]


@router.post("/seed", response_model=SeedResult)
async def seed():
    from src.conversations.application.commands import (
        ConversationCommandHandler,
        CreateConversationCommand,
    )
    from src.conversations.infrastructure.repositories import MongoConversationRepository
    from src.iam.application.auth_service import AuthService
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

    # Wipe all collections for a clean slate
    for col in await db.list_collection_names():
        await db[col].drop()

    user_repo = MongoUserRepository(db)
    auth_svc = AuthService(user_repo)
    for email, password, _ in _USERS:
        await auth_svc.register(email, password)

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

    authz = AuthorizationService(get_enforcer(), MongoGroupRepository(db), db)
    await authz.grant_superadmin(superadmin.id)

    # Scope hierarchy
    campaign_handler = CampaignCommandHandler(MongoCampaignRepository(db), MongoOrganizationRepository(db))

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

    # Campaigns at all three levels
    await campaign_handler.create(CreateCampaignCommand(
        name="Brand Awareness", parent_type="organization", parent_id=org.id,
        org_id=org.id, requesting_user_id=alice.id,
    ))
    await campaign_handler.create(CreateCampaignCommand(
        name="Lead Generation", parent_type="project", parent_id=project.id,
        org_id=org.id, requesting_user_id=alice.id,
    ))
    campaign = await campaign_handler.create(CreateCampaignCommand(
        name="Q1 2025 Launch", parent_type="subproject", parent_id=subproject.id,
        org_id=org.id, requesting_user_id=alice.id,
    ))

    oid = str(org.id)
    pid = str(project.id)
    sid = str(subproject.id)
    cid = str(campaign.id)

    # Role assignments
    await authz.assign_role(f"user:{bob.id}",   "supervisor", "org",        oid)
    await authz.assign_role(f"user:{carol.id}",  "editor",     "project",    pid)
    await authz.assign_role(f"user:{dave.id}",   "viewer",     "campaign",   cid)
    await authz.assign_role(f"user:{eve.id}",    "supervisor", "subproject", sid)
    await authz.assign_role(f"user:{frank.id}",  "editor",     "org",        oid)
    await authz.assign_role(f"user:{grace.id}",  "viewer",     "project",    pid)
    await authz.assign_role(f"user:{henry.id}",  "editor",     "campaign",   cid)
    await authz.assign_role(f"user:{ivan.id}",   "viewer",     "org",        oid)

    # Groups
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

    # Tags
    tag_repo = MongoTagRepository(db)
    tags = {}
    for name in ("urgent", "design", "technical", "review", "blocked"):
        t = Tag.create(name=name, org_id=org.id)
        await tag_repo.save(t)
        tags[name] = t

    # 100 conversations on the Q1 2025 Launch campaign
    creators = [alice, bob, carol, dave, eve, frank, grace, henry]
    tag_list = list(tags.values())
    conv = ConversationCommandHandler(MongoConversationRepository(db))

    random.seed(42)
    for i in range(100):
        topic = _TOPICS[i % len(_TOPICS)]
        agent = _AGENTS[i % len(_AGENTS)]
        creator = creators[i % len(creators)]
        n_tags = random.randint(0, 2)
        selected_tags = random.sample(tag_list, n_tags)
        await conv.create(CreateConversationCommand(
            title=f"{topic} — {agent} #{i + 1:02d}",
            content=f"Transcript of {topic.lower()} with {agent}.",
            created_by=creator.id,
            organization_id=org.id,
            scope_id=campaign.id,
            scope_type="campaign",
            tag_ids=[t.id for t in selected_tags],
        ))

    return SeedResult(
        status="seeded",
        credentials=[SeedCredentials(email=e, password=p, role=r) for e, p, r in _USERS],
        org_id=oid,
        project_id=pid,
        subproject_id=sid,
        campaign_id=cid,
    )
