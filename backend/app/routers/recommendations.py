from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_merchant
from app.database import get_db
from app.engine.weighting import generate_recommendation
from app.models import Merchant, Recommendation, RecommendationStatus, Service
from app.recommendation import build_recommendation
from app.schemas import PendingRecommendationOut, RecommendationOut, RecommendationRespond

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/current", response_model=RecommendationOut)
def current_recommendation(
    service_id: int,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    service = db.get(Service, service_id)
    if service is None or service.merchant_id != current_merchant.id:
        raise HTTPException(status_code=404, detail="Layanan tidak ditemukan")

    recommendation = (
        db.query(Recommendation)
        .filter(Recommendation.service_id == service_id, Recommendation.status == RecommendationStatus.pending)
        .order_by(Recommendation.created_at.desc())
        .first()
    )
    if recommendation is None:
        # A recommendation computed against a guessed/default location is the
        # same bug as always using Banda Aceh's centroid -- refuse instead.
        if current_merchant.latitude is None or current_merchant.longitude is None:
            raise HTTPException(
                status_code=422,
                detail="Lokasi usaha belum dapat dipetakan, mohon perjelas alamat Anda di halaman Akun.",
            )
        result = generate_recommendation(
            service.listed_price, service.hpp, current_merchant.latitude, current_merchant.longitude
        )
        recommendation = build_recommendation(
            service_id=service.id,
            hpp=service.hpp,
            suggested_price=result.suggested_price,
            rationale_text=result.rationale_text,
            weather_snapshot_json=result.weather_snapshot_json,
        )
        db.add(recommendation)
        db.commit()
        db.refresh(recommendation)
    return recommendation


@router.get("/pending", response_model=list[PendingRecommendationOut])
def list_pending_recommendations(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    # Read-only: lists recommendations that already exist. Deliberately does NOT
    # call generate_recommendation for services that don't have one yet -- unlike
    # /current, this can be polled for a notification badge without silently
    # burning OpenWeather/Geoapify free-tier quota on every check.
    rows = (
        db.query(Recommendation, Service.name)
        .join(Service, Recommendation.service_id == Service.id)
        .filter(
            Service.merchant_id == current_merchant.id,
            Service.is_active.is_(True),
            Recommendation.status == RecommendationStatus.pending,
        )
        .order_by(Recommendation.created_at.desc())
        .all()
    )
    return [
        PendingRecommendationOut(
            id=rec.id,
            service_id=rec.service_id,
            service_name=service_name,
            suggested_price=rec.suggested_price,
            rationale_text=rec.rationale_text,
            created_at=rec.created_at,
        )
        for rec, service_name in rows
    ]


@router.post("/{recommendation_id}/respond", response_model=RecommendationOut)
def respond_recommendation(
    recommendation_id: int,
    payload: RecommendationRespond,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    recommendation = (
        db.query(Recommendation)
        .join(Service, Recommendation.service_id == Service.id)
        .filter(Recommendation.id == recommendation_id, Service.merchant_id == current_merchant.id)
        .first()
    )
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Rekomendasi tidak ditemukan")
    if recommendation.status != RecommendationStatus.pending:
        raise HTTPException(status_code=409, detail="Rekomendasi sudah direspons")

    recommendation.status = RecommendationStatus(payload.status)
    recommendation.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(recommendation)
    return recommendation
