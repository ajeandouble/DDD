from uuid import UUID

from src.iam.domain.models import User
from src.iam.domain.repositories import UserRepository
from src.shared.jwt import decode_token


class TokenError(Exception):
    pass


class TokenService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def resolve(self, raw_token: str) -> User:
        try:
            user_id = decode_token(raw_token)
        except Exception:
            raise TokenError("Invalid or expired token")

        user = await self._repo.find_by_id(UUID(user_id))
        if user is None:
            raise TokenError("User not found")
        return user
