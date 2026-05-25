import base64
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel

from src.iam.application.auth_service import AuthError, AuthService
from src.iam.domain.models import Avatar, User
from src.iam.infrastructure.repositories import MongoAvatarRepository, MongoUserRepository
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service() -> AuthService:
    return AuthService(MongoUserRepository(get_db()))


def _user_repo() -> MongoUserRepository:
    return MongoUserRepository(get_db())


def _avatar_repo() -> MongoAvatarRepository:
    return MongoAvatarRepository(get_db())


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
    has_avatar: bool = False
    is_superadmin: bool = False
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


def _user_resp(user: User, has_avatar: bool = False, is_superadmin: bool = False) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        locale=user.locale,
        has_avatar=has_avatar,
        is_superadmin=is_superadmin,
        created_at=user.created_at.isoformat(),
    )


@router.get("/me", response_model=UserResponse)
async def me(
    user: User = Depends(get_current_user),
    avatar_repo: MongoAvatarRepository = Depends(_avatar_repo),
    authz=Depends(get_authz),
):
    has_avatar = await avatar_repo.find_by_user(user.id) is not None
    return _user_resp(
        user, has_avatar=has_avatar, is_superadmin=authz.is_superadmin(f"user:{user.id}")
    )


@router.patch("/me/preferences", response_model=UserResponse)
async def update_preferences(
    body: PreferencesBody,
    user: User = Depends(get_current_user),
    repo: MongoUserRepository = Depends(_user_repo),
    avatar_repo: MongoAvatarRepository = Depends(_avatar_repo),
    authz=Depends(get_authz),
):
    try:
        user.set_locale(body.locale)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    await repo.update(user)
    has_avatar = await avatar_repo.find_by_user(user.id) is not None
    return _user_resp(
        user, has_avatar=has_avatar, is_superadmin=authz.is_superadmin(f"user:{user.id}")
    )


_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_BYTES = 400 * 1024  # 400 KB — client compresses to ≤200 KB, give headroom


@router.put("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile,
    user: User = Depends(get_current_user),
    avatar_repo: MongoAvatarRepository = Depends(_avatar_repo),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported image type: {file.content_type}",
        )
    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be ≤ {_MAX_BYTES // 1024} KB after compression",
        )
    avatar = Avatar.create(
        user_id=user.id,
        data=base64.b64encode(data).decode(),
        content_type=file.content_type,
    )
    await avatar_repo.save(avatar)
    return _user_resp(user, has_avatar=True)


@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    user: User = Depends(get_current_user),
    avatar_repo: MongoAvatarRepository = Depends(_avatar_repo),
):
    await avatar_repo.delete(user.id)


@router.get("/users/{user_id}/avatar")
async def get_avatar(
    user_id: UUID,
    avatar_repo: MongoAvatarRepository = Depends(_avatar_repo),
):
    avatar = await avatar_repo.find_by_user(user_id)
    if avatar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(
        content=base64.b64decode(avatar.data),
        media_type=avatar.content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )
