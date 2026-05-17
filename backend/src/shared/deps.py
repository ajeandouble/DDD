from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.iam.application.token_service import TokenError, TokenService
from src.iam.domain.models import ApiKey, Principal, User
from src.iam.infrastructure.repositories import (
    MongoApiKeyRepository,
    MongoGroupRepository,
    MongoUserRepository,
)
from src.shared.database import get_db

_bearer = HTTPBearer()


async def get_current_principal(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Principal:
    token = creds.credentials
    db = get_db()

    if token.startswith("ddd_"):
        key_hash = ApiKey.hash_raw(token)
        api_key = await MongoApiKeyRepository(db).find_by_hash(key_hash)
        if api_key is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        return api_key

    svc = TokenService(MongoUserRepository(db))
    try:
        return await svc.resolve(token)
    except TokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> User:
    principal = await get_current_principal(creds)
    if not isinstance(principal, User):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This endpoint requires user authentication, not an API key",
        )
    return principal


def principal_subject(principal: Principal) -> str:
    """Return the Casbin subject string for a principal."""
    if isinstance(principal, User):
        return f"user:{principal.id}"
    return f"apikey:{principal.id}"


def get_authz():
    """Return a fresh AuthorizationService bound to the current DB."""
    # Imported here to avoid import-time dependency on the enforcer singleton
    from src.iam.application.authorization_service import AuthorizationService
    from src.iam.infrastructure.enforcer import get_enforcer

    db = get_db()
    return AuthorizationService(get_enforcer(), MongoGroupRepository(db), db)


def get_quota_service():
    from src.billing.application.quota_service import QuotaService
    from src.billing.infrastructure.repositories import MongoSubscriptionRepository

    return QuotaService(MongoSubscriptionRepository(get_db()))
