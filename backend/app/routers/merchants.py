from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Merchant
from app.schemas import MerchantOut, MerchantUpdate

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.get("/{merchant_id}", response_model=MerchantOut)
def get_merchant(merchant_id: int, db: Session = Depends(get_db)):
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise HTTPException(status_code=404, detail="Merchant tidak ditemukan")
    return merchant


@router.put("/{merchant_id}", response_model=MerchantOut)
def update_merchant(merchant_id: int, payload: MerchantUpdate, db: Session = Depends(get_db)):
    merchant = db.get(Merchant, merchant_id)
    if merchant is None:
        raise HTTPException(status_code=404, detail="Merchant tidak ditemukan")
    merchant.name = payload.name
    merchant.business_name = payload.business_name
    merchant.location = payload.location
    db.commit()
    db.refresh(merchant)
    return merchant
