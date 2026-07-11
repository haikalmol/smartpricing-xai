from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation, RecommendationStatus, Service
from app.recommendation import generate_stub_recommendation
from app.schemas import RecommendationOut, RecommendationRespond

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


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
        suggested_price, rationale_text, weather_snapshot = generate_stub_recommendation(service)
        recommendation = Recommendation(
            service_id=service.id,
            suggested_price=suggested_price,
            rationale_text=rationale_text,
            weather_snapshot_json=weather_snapshot,
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
