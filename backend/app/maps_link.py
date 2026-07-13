"""Parse a pasted Google Maps share link into (lat, lon, place_name).

Replaces free-text address geocoding (app/geocoding.py's Geoapify call) as
the PRIMARY way a merchant sets their location's lat/lon from Edit Profil.
H21 showed Geoapify can't confidently resolve real detailed Indonesian
street addresses (a genuine Kuta Alam address returned confidence 0.17 and
was correctly rejected). A pasted Google Maps link carries an exact
coordinate straight from Google's own pin -- no confidence guessing needed.

Formats handled, verified against real links and Google's own URL docs, not
guessed:

  - Short links (maps.app.goo.gl/..., goo.gl/maps/...) -- plain HTTP
    redirects. Verified live against two real, publicly-posted short links:
      https://maps.app.goo.gl/PR2d5Et72zFTvugP7
        -> 302 -> https://www.google.co.in/maps/place/Anand+Tea+Stall/
           @26.4989241,80.1953814,12z/data=!4m7!...!3d26.4079081!4d80.315302!...
      https://maps.app.goo.gl/Te3bCD25fY3FHnFo9
        -> 302 -> https://www.google.com/maps/@/data=!4m5!7m4!1m2!1s...!2s...!2e2
    The first case is exactly why !3d/!4d is checked BEFORE @lat,lon below:
    its @26.4989241,80.1953814 (viewport center) and its !3d26.4079081!4d80.315302
    (actual pin) are ~10km apart in that real link -- using @ there would
    have silently picked the wrong coordinate. The second case is a
    Street-View/panorama share with no plain-decimal coordinate anywhere in
    the resolved URL at all; this module correctly returns None for it
    rather than guessing -- a real example of the "can't resolve, don't
    fall back" case, not a hypothetical one.

  - Long links with @lat,lon,zoom in the path, e.g. (published, cited
    example) https://google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z

  - Long links with coordinates in a query parameter -- legacy `q=`, or the
    modern api=1 `query=`/`center=` params per Google's own "Get Started |
    Maps URLs" docs: .../search/?api=1&query=LAT,LON and
    .../@?api=1&map_action=map&center=LAT,LON&zoom=LEVEL.

  - A bare-coordinate /place/<lat>,<lon>/ segment (a dropped pin with no
    named place still routes through /place/).

If none of these patterns match, this returns None. Callers must NOT fall
back to a default location -- that's the exact bug this project already
diagnosed and fixed once (the Banda Aceh-centroid issue).
"""
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qs, unquote_plus, urlparse

import requests

SHORT_LINK_HOSTS = {"maps.app.goo.gl", "goo.gl"}
_COORD = r"(-?\d{1,3}\.\d+)"

# Order matters: !3d/!4d (the actual pinned point) is checked before @lat,lon
# (only the map viewport center) -- see module docstring for the real link
# where these two differ by ~10km.
_INLINE_PATTERNS = [
    re.compile(rf"!3d{_COORD}!4d{_COORD}"),
    re.compile(rf"/@{_COORD},{_COORD},"),
    re.compile(rf"/place/{_COORD},{_COORD}(?:/|$)"),
]
_QUERY_PARAM_KEYS = ("query", "q", "center")


@dataclass
class MapsLinkResult:
    lat: float
    lon: float
    place_name: Optional[str]  # from a /place/<Name>/ segment, when present and not itself bare coordinates


def _place_name_from_path(path: str) -> Optional[str]:
    match = re.search(r"/place/([^/@]+)", path)
    if not match:
        return None
    raw = match.group(1)
    if re.fullmatch(rf"{_COORD},{_COORD}", raw):
        return None  # bare coordinates, not a real place name
    return unquote_plus(raw)


def _parse_resolved_url(url: str) -> Optional[MapsLinkResult]:
    parsed = urlparse(url)
    place_name = _place_name_from_path(parsed.path)

    for pattern in _INLINE_PATTERNS:
        match = pattern.search(url)
        if match:
            return MapsLinkResult(lat=float(match.group(1)), lon=float(match.group(2)), place_name=place_name)

    query = parse_qs(parsed.query)
    for key in _QUERY_PARAM_KEYS:
        if key in query:
            m = re.fullmatch(rf"{_COORD},{_COORD}", query[key][0])
            if m:
                return MapsLinkResult(lat=float(m.group(1)), lon=float(m.group(2)), place_name=place_name)

    return None


def parse_maps_link(url: str) -> Optional[MapsLinkResult]:
    url = url.strip()
    parsed = urlparse(url)

    if parsed.hostname in SHORT_LINK_HOSTS:
        try:
            resp = requests.get(
                url,
                allow_redirects=True,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SmartPricingXAI/1.0)"},
            )
        except requests.RequestException:
            return None
        return _parse_resolved_url(resp.url)

    return _parse_resolved_url(url)
