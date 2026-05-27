import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt


def create_token(user_id: UUID) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, os.environ["SECRET_KEY"], algorithm="HS256")


def decode_token(token: str) -> str:
    payload = jwt.decode(token, os.environ["SECRET_KEY"], algorithms=["HS256"])
    return payload["sub"]
