from decimal import Decimal
from typing import Optional

from app.models import Service


def clamp_to_hpp(price: Decimal, hpp: Decimal) -> Decimal:
    """Guard-rail: a suggested price may never go below HPP. Called by every recommendation source."""
    return price if price >= hpp else hpp


def generate_stub_recommendation(service: Service) -> tuple[Decimal, str, Optional[dict]]:
    """Placeholder until the hyper-localized weighting algorithm (Stage E) replaces this."""
    raw_price = service.listed_price * Decimal("0.9")
    suggested_price = clamp_to_hpp(raw_price, service.hpp)
    rationale_text = (
        "Rekomendasi sementara: diskon 10% dari harga saat ini. Alasan berbasis cuaca "
        "dan keramaian lokasi akan aktif setelah algoritma AI selesai dibangun."
    )
    return suggested_price, rationale_text, None
