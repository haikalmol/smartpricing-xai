from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Service
from app.schemas import ServiceCreate, ServiceHppUpdate, ServiceOut

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
def list_services(merchant_id: int, db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.merchant_id == merchant_id).all()


@router.post("", response_model=ServiceOut, status_code=201)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)):
    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/{service_id}/hpp", response_model=ServiceOut)
def update_hpp(service_id: int, payload: ServiceHppUpdate, db: Session = Depends(get_db)):
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Layanan tidak ditemukan")
    service.hpp = payload.hpp
    db.commit()
    db.refresh(service)
    return service
