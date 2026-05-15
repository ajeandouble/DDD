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


_USERS = [
    ("superadmin@ddd.dev", "SuperAdmin123!", "superadmin"),
    ("alice@ddd.dev", "Alice123!", "org_admin"),
    ("bob@ddd.dev", "Bob123!", "supervisor"),
    ("carol@ddd.dev", "Carol123!", "editor"),
    ("dave@ddd.dev", "Dave123!", "viewer"),
]


@router.post("/seed", response_model=SeedResult)
async def seed():
    from src.conversations.application.commands import (
        ConversationCommandHandler,
        CreateConversationCommand,
    )
    from src.conversations.infrastructure.repositories import MongoConversationRepository
    from src.iam.application.auth_service import AuthService, AuthError
    from src.iam.application.authorization_service import AuthorizationService
    from src.iam.domain.models import Tag
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
            project = await db["scopes_projects"].find_one(
                {"organization_id": str(org["_id"])}
            )
            subproject = (
                await db["scopes_subprojects"].find_one(
                    {"project_id": str(project["_id"])}
                )
                if project
                else None
            )
            campaign = (
                await db["scopes_campaigns"].find_one(
                    {"subproject_id": str(subproject["_id"])}
                )
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
            pass  # already exists

    users = {
        email: await user_repo.find_by_email(email)
        for email, _, _ in _USERS
    }
    superadmin_user = users["superadmin@ddd.dev"]
    alice = users["alice@ddd.dev"]
    bob = users["bob@ddd.dev"]
    carol = users["carol@ddd.dev"]
    dave = users["dave@ddd.dev"]

    # --- Authz service ---
    authz = AuthorizationService(get_enforcer(), MongoGroupRepository(db), db)

    # Grant superadmin
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

    # --- Assign roles ---
    await authz.assign_role(f"user:{bob.id}", "supervisor", "org", str(org.id))
    await authz.assign_role(f"user:{carol.id}", "editor", "project", str(project.id))
    await authz.assign_role(f"user:{dave.id}", "viewer", "campaign", str(campaign.id))

    # --- Create tags ---
    tag_repo = MongoTagRepository(db)
    tags = {}
    for name in ("urgent", "design", "technical"):
        t = Tag.create(name=name, org_id=org.id)
        await tag_repo.save(t)
        tags[name] = t

    # --- Create conversations at each scope level ---
    conv_handler = ConversationCommandHandler(MongoConversationRepository(db))

    await conv_handler.create(
        CreateConversationCommand(
            title="Q1 Strategy",
            content="Aligning on company direction for Q1. Key topics: hiring, product roadmap, budget.",
            created_by=alice.id,
            organization_id=org.id,
            scope_type="organization",
            tag_ids=[tags["urgent"].id],
        )
    )
    await conv_handler.create(
        CreateConversationCommand(
            title="Tech Stack Decision",
            content="Evaluating React vs Vue for the frontend rewrite. Performance benchmarks attached.",
            created_by=bob.id,
            organization_id=org.id,
            scope_id=project.id,
            scope_type="project",
            tag_ids=[tags["technical"].id],
        )
    )
    await conv_handler.create(
        CreateConversationCommand(
            title="Component Library",
            content="Proposing Mantine as our component library. Covers accessibility and dark mode.",
            created_by=carol.id,
            organization_id=org.id,
            scope_id=subproject.id,
            scope_type="subproject",
            tag_ids=[tags["design"].id, tags["technical"].id],
        )
    )
    await conv_handler.create(
        CreateConversationCommand(
            title="Launch Checklist",
            content="Pre-launch checklist: QA sign-off, CDN config, monitoring alerts, rollback plan.",
            created_by=carol.id,
            organization_id=org.id,
            scope_id=campaign.id,
            scope_type="campaign",
            tag_ids=[tags["urgent"].id, tags["design"].id],
        )
    )

    return SeedResult(
        status="seeded",
        credentials=[SeedCredentials(email=e, password=p, role=r) for e, p, r in _USERS],
        org_id=str(org.id),
        project_id=str(project.id),
        subproject_id=str(subproject.id),
        campaign_id=str(campaign.id),
    )
