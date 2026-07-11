from decimal import Decimal
from typing import Optional

from app.models import Recommendation, RecommendationStatus


def clamp_to_hpp(price: Decimal, hpp: Decimal) -> Decimal:
    """Guard-rail: a suggested price may never go below HPP. Called by every recommendation source."""
    return price if price >= hpp else hpp


def build_recommendation(
    service_id: int,
    hpp: Decimal,
    suggested_price: Decimal,
    rationale_text: str,
    weather_snapshot_json: Optional[dict],
) -> Recommendation:
    """The only place a Recommendation row gets constructed. Re-clamps to HPP right before persisting
    so the guard-rail holds even if a future algorithm forgets to call clamp_to_hpp itself."""
    if suggested_price < hpp:
        suggested_price = hpp
        rationale_text = f"{rationale_text} Rekomendasi disesuaikan agar tetap di atas HPP."

    return Recommendation(
        service_id=service_id,
        suggested_price=suggested_price,
        rationale_text=rationale_text,
        weather_snapshot_json=weather_snapshot_json,
        status=RecommendationStatus.pending,
    )
