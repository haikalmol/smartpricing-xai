from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_merchant
from app.database import get_db
from app.models import Merchant
from app.schemas import MerchantOut, MerchantUpdate

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.get("/me", response_model=MerchantOut)
def get_my_merchant(current_merchant: Merchant = Depends(get_current_merchant)):
    return current_merchant


@router.put("/me", response_model=MerchantOut)
def update_my_merchant(
    payload: MerchantUpdate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    current_merchant.name = payload.name
    current_merchant.business_name = payload.business_name
    current_merchant.location = payload.location
    db.commit()
    db.refresh(current_merchant)
    return current_merchant
