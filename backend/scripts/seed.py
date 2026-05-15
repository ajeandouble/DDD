"""
Seed the dev database with a default user and a default conversation.
Run from backend/: uv run python scripts/seed.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(".env.dev")

from src.shared.database import connect, disconnect, get_db
from src.iam.application.auth_service import AuthError, AuthService
from src.iam.infrastructure.repositories import MongoUserRepository
from src.conversations.domain.models import Conversation
from src.conversations.infrastructure.repositories import MongoConversationRepository

SEED_EMAIL = "admin@ddd.local"
SEED_PASSWORD = "password123"


async def main() -> None:
    await connect()
    db = get_db()

    # --- user ---
    user_repo = MongoUserRepository(db)
    svc = AuthService(user_repo)
    try:
        token = await svc.register(SEED_EMAIL, SEED_PASSWORD)
        print(f"Created user:  {SEED_EMAIL}")
    except AuthError:
        token = await svc.login(SEED_EMAIL, SEED_PASSWORD)
        print(f"User exists:   {SEED_EMAIL}")

    user = await user_repo.find_by_email(SEED_EMAIL)
    assert user is not None
    print(f"Token:         {token}")

    # --- conversation ---
    conv_repo = MongoConversationRepository(db)
    existing = await conv_repo.find_all(limit=1)
    if existing:
        print(f"Conversation exists: {existing[0].title}")
    else:
        c = Conversation.create(
            title="Welcome conversation",
            content="This is the default seeded conversation.",
            created_by=user.id,
            metadata=[("source", "seed"), ("lang", "en")],
            emit_webhook=False,
        )
        await conv_repo.save(c)
        print(f"Created conversation: {c.title} ({c.id})")

    await disconnect()


asyncio.run(main())
