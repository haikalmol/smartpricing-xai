from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.engine.weighting import generate_recommendation
from app.models import Recommendation, RecommendationStatus, Service
from app.recommendation import build_recommendation
from app.schemas import RecommendationOut, RecommendationRespond

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# TODO: merchant.location (CLAUDE.md data model) is free text, no lat/lon yet.
# Using a fixed Banda Aceh centroid until geocoding (Geoapify) or dedicated
# lat/lon columns are added to merchant.
DEFAULT_LAT = 5.5483
DEFAULT_LON = 95.3238


@router.get("/current", response_model=RecommendationOut)
def current_recommendation(service_id: int, db: Session = Depends(get_db)):
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Layanan tidak ditemukan")

    recommendation = (
        db.query(Recommendation)
        .filter(Recommendation.service_id == service_id, Recommendation.status == RecommendationStatus.pending)
        .order_by(Recommendation.created_at.desc())
        .first()
    )
    if recommendation is None:
        result = generate_recommendation(service.listed_price, service.hpp, DEFAULT_LAT, DEFAULT_LON)
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


@router.post("/{recommendation_id}/respond", response_model=RecommendationOut)
def respond_recommendation(recommendation_id: int, payload: RecommendationRespond, db: Session = Depends(get_db)):
    recommendation = db.get(Recommendation, recommendation_id)
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Rekomendasi tidak ditemukan")
    if recommendation.status != RecommendationStatus.pending:
        raise HTTPException(status_code=409, detail="Rekomendasi sudah direspons")

    recommendation.status = RecommendationStatus(payload.status)
    recommendation.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(recommendation)
    return recommendation
