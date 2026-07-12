from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_merchant
from app.database import get_db
from app.models import Merchant, Service
from app.schemas import ServiceCreate, ServiceHppUpdate, ServiceOut

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
def list_services(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    return (
        db.query(Service)
        .filter(Service.merchant_id == current_merchant.id, Service.is_active.is_(True))
        .all()
    )


@router.post("", response_model=ServiceOut, status_code=201)
def create_service(
    payload: ServiceCreate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    service = Service(merchant_id=current_merchant.id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/{service_id}/hpp", response_model=ServiceOut)
def update_hpp(
    service_id: int,
    payload: ServiceHppUpdate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    service = db.get(Service, service_id)
    if service is None or service.merchant_id != current_merchant.id:
        raise HTTPException(status_code=404, detail="Layanan tidak ditemukan")
    service.hpp = payload.hpp
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    service = db.get(Service, service_id)
    if service is None or service.merchant_id != current_merchant.id or not service.is_active:
        raise HTTPException(status_code=404, detail="Layanan tidak ditemukan")
    service.is_active = False
    db.commit()
