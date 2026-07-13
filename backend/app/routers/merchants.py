from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_merchant
from app.database import get_db
from app.maps_link import parse_maps_link
from app.models import Merchant, Recommendation, RecommendationStatus, Service
from app.schemas import MerchantOut, MerchantStatsOut, MerchantUpdate

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.get("/me", response_model=MerchantOut)
def get_my_merchant(current_merchant: Merchant = Depends(get_current_merchant)):
    return current_merchant


@router.get("/me/stats", response_model=MerchantStatsOut)
def get_my_merchant_stats(
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    # "Layanan" counts active services only -- matches Katalog's own listing
    # filter (services.py's list_services), not soft-deleted cruft.
    services_count = (
        db.query(func.count(Service.id))
        .filter(Service.merchant_id == current_merchant.id, Service.is_active.is_(True))
        .scalar()
    )
    # "Saran AI" / "Disetujui" count every recommendation ever generated for
    # this merchant, including ones tied to a since-deleted service -- this
    # is real adoption history (CLAUDE.md: every decision stays logged), not
    # scoped down to whatever happens to still be in the active catalog.
    service_ids = db.query(Service.id).filter(Service.merchant_id == current_merchant.id)
    recommendations_count = (
        db.query(func.count(Recommendation.id)).filter(Recommendation.service_id.in_(service_ids)).scalar()
    )
    approved_count = (
        db.query(func.count(Recommendation.id))
        .filter(Recommendation.service_id.in_(service_ids), Recommendation.status == RecommendationStatus.approved)
        .scalar()
    )
    return MerchantStatsOut(
        services_count=services_count,
        recommendations_count=recommendations_count,
        approved_count=approved_count,
    )


@router.put("/me", response_model=MerchantOut)
def update_my_merchant(
    payload: MerchantUpdate,
    current_merchant: Merchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    # Pasted Google Maps link is now the PRIMARY way lat/lon gets set --
    # free-text address geocoding (Geoapify) is unreliable on real detailed
    # Indonesian addresses (H21: a genuine Kuta Alam street address resolved
    # at confidence 0.17 and was correctly rejected). No link submitted this
    # save -> leave latitude/longitude/geocoded_label exactly as they were.
    if payload.maps_link and payload.maps_link.strip():
        parsed = parse_maps_link(payload.maps_link)
        if parsed is None:
            raise HTTPException(
                status_code=422,
                detail="Link Google Maps tidak dikenali. Coba salin ulang link dari tombol Bagikan "
                       "di Google Maps, atau hubungi Najwa untuk bantuan.",
            )
        current_merchant.latitude = parsed.lat
        current_merchant.longitude = parsed.lon
        # Resolved place name (e.g. from a /place/<Name>/ segment) wins when
        # present; otherwise the label falls back to the merchant's own
        # free-text location rather than being left stale from a prior link.
        current_merchant.geocoded_label = parsed.place_name or payload.location

        # A confirmed new location makes any still-PENDING recommendation
        # stale -- it was computed against the old/missing coordinates, and
        # current_recommendation() only generates a fresh one when none is
        # pending, so without this a merchant who fixes their location keeps
        # seeing an unrelated old suggestion indefinitely. Only pending rows
        # are touched -- approved/rejected recommendations are a merchant's
        # already-logged decision (CLAUDE.md) and must never be deleted.
        db.query(Recommendation).filter(
            Recommendation.service_id.in_(
                db.query(Service.id).filter(Service.merchant_id == current_merchant.id)
            ),
            Recommendation.status == RecommendationStatus.pending,
        ).delete(synchronize_session=False)

    current_merchant.name = payload.name
    current_merchant.business_name = payload.business_name
    current_merchant.location = payload.location
    db.commit()
    db.refresh(current_merchant)
    return current_merchant
