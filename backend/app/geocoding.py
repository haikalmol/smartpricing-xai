"""Geoapify forward geocoding for merchant.location -> lat/lon.

Called once at registration and again whenever location text actually
changes (PUT /merchants/me) -- never on every recommendation request, since
a merchant's location rarely changes and geocoding it per-request would burn
the free-tier Geoapify quota for nothing. See app/engine/weighting.py for
the separate Places density call this project already makes against the
same API key.

This product is Aceh UMKM pariwisata only (CLAUDE.md), so every query is
proximity-biased toward Banda Aceh and any top result whose `state` isn't
Aceh is rejected outright, rather than trusted. That check is load-bearing,
not decorative: verified empirically that Geoapify's own rank.confidence is
NOT a reliable ambiguity signal by itself -- querying "Jalan Merdeka" (an
extremely common Indonesian street name) returns confidence=1.0
"full_match" for three different cities (Bandung x2, Palembang), none of
them in Aceh. The state check is what actually catches that; confidence is
only a secondary filter.
"""
import os
from typing import Optional

import requests

GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search"

ACEH_BIAS_LON, ACEH_BIAS_LAT = 95.3192908, 5.5528455  # Banda Aceh, geocoded
ACEH_STATE_NAME = "aceh"
MIN_CONFIDENCE = 0.5


def geocode_location(location_text: str) -> Optional[tuple[float, float]]:
    """Resolve free-text merchant.location to (lat, lon).

    Returns None if it can't be resolved with confidence -- no match, a
    low-confidence match, or a top match outside Aceh (almost always a sign
    the text was too generic/ambiguous to trust, per the module docstring).
    Callers must store None as-is; never substitute a default location on
    failure -- that's the exact Banda Aceh-centroid bug this replaces.
    """
    key = os.environ["GEOAPIFY_API_KEY"]
    resp = requests.get(
        GEOCODE_URL,
        params={
            "text": location_text,
            "filter": "countrycode:id",
            "bias": f"proximity:{ACEH_BIAS_LON},{ACEH_BIAS_LAT}",
            "format": "json",
            "limit": 1,
            "apiKey": key,
        },
        timeout=10,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if not results:
        return None

    top = results[0]
    confidence = top.get("rank", {}).get("confidence", 0)
    state = (top.get("state") or "").strip().lower()
    if confidence < MIN_CONFIDENCE or state != ACEH_STATE_NAME:
        return None

    return top["lat"], top["lon"]
