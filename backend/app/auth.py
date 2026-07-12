import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Merchant

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRES = timedelta(days=30)
# ponytail: no refresh-token rotation -- 30-day expiry is fine at pilot scale,
# add if session churn becomes a real complaint.

_bearer = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(merchant_id: int) -> str:
    payload = {
        "sub": str(merchant_id),
        "exp": datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRES,
    }
    return jwt.encode(payload, os.environ["SECRET_KEY"], algorithm=ALGORITHM)


def get_current_merchant(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Merchant:
    try:
        payload = jwt.decode(credentials.credentials, os.environ["SECRET_KEY"], algorithms=[ALGORITHM])
        merchant_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Sesi tidak valid, silakan masuk kembali")

    merchant = db.get(Merchant, merchant_id)
    if merchant is None or not merchant.is_active:
        raise HTTPException(status_code=401, detail="Sesi tidak valid, silakan masuk kembali")
    return merchant
