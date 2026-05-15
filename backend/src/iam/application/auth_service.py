from src.iam.domain.models import User
from src.iam.domain.repositories import UserRepository
from src.shared.jwt import create_token


class AuthError(Exception):
    pass


class AuthService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def register(self, email: str, password: str) -> str:
        if await self._repo.find_by_email(email):
            raise AuthError("Email already registered")
        user = User.register(email, password)
        await self._repo.save(user)
        return create_token(user.id)

    async def login(self, email: str, password: str) -> str:
        user = await self._repo.find_by_email(email)
        if not user or not user.verify_password(password):
            raise AuthError("Invalid credentials")
        return create_token(user.id)
