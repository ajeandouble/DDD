from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.iam.application.auth_service import AuthError, AuthService
from src.iam.domain.models import User
from src.iam.infrastructure.repositories import MongoUserRepository
from src.shared.database import get_db
from src.shared.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service() -> AuthService:
    return AuthService(MongoUserRepository(get_db()))


def _user_repo() -> MongoUserRepository:
    return MongoUserRepository(get_db())


class Credentials(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    locale: str
    created_at: str


class PreferencesBody(BaseModel):
    locale: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: Credentials, svc: AuthService = Depends(_auth_service)):
    try:
        token = await svc.register(body.email, body.password)
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: Credentials, svc: AuthService = Depends(_auth_service)):
    try:
        token = await svc.login(body.email, body.password)
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return TokenResponse(access_token=token)


def _user_resp(user: User) -> UserResponse:
    return UserResponse(
        id=user.id, email=user.email, locale=user.locale, created_at=user.created_at.isoformat()
    )


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return _user_resp(user)


@router.patch("/me/preferences", response_model=UserResponse)
async def update_preferences(
    body: PreferencesBody,
    user: User = Depends(get_current_user),
    repo: MongoUserRepository = Depends(_user_repo),
):
    try:
        user.set_locale(body.locale)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    await repo.update(user)
    return _user_resp(user)
