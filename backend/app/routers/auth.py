from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_merchant, hash_password, verify_password
from app.database import get_db
from app.models import Merchant
from app.schemas import LoginRequest, RegisterRequest, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    merchant = Merchant(
        name=payload.name,
        business_name=payload.business_name,
        location=payload.location,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(merchant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    db.refresh(merchant)
    return TokenOut(access_token=create_access_token(merchant.id), merchant=merchant)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.email == payload.email.lower()).first()
    if (
        merchant is None
        or not merchant.is_active
        or not verify_password(payload.password, merchant.password_hash)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email atau kata sandi salah")
    return TokenOut(access_token=create_access_token(merchant.id), merchant=merchant)


@router.delete("/account", status_code=204)
def delete_account(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    current_merchant.is_active = False
    db.commit()
