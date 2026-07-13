"""Hyper-localized weighting algorithm (CLAUDE.md "Core algorithm").

Three independent, inspectable inputs — weather, local calendar, visitor
density — each contribute a signed discount-percentage-point and a Bahasa
Indonesia rationale fragment. They're summed into one suggestion so you can
always see which input drove the number (returned as `contributions`),
never a black-box score.

`compute_recommendation` is pure (no I/O, no DB) so it's unit-testable with
mock signals. `fetch_weather` / `fetch_density` do the actual API calls and
`generate_recommendation` wires everything together for real use.
"""
import os
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

import requests

# app.recommendation -> app.models -> app.database, which loads .env at import
# time (see app/database.py) -- no need to load it again here.
from app.recommendation import clamp_to_hpp

BASE_DISCOUNT_PCT = Decimal(5)
MIN_DISCOUNT_PCT = Decimal(0)
MAX_DISCOUNT_PCT = Decimal(25)

# TODO(Stage E+): moveable holidays (Idul Fitri, Idul Adha, Isra Mikraj, Nyepi,
# waktu ibadah, dll.) depend on a lunar/lunisolar calendar and need a real
# calendar API — not safe to hardcode. This list only covers fixed-date
# national holidays, enough for MVP demo purposes.
NATIONAL_HOLIDAYS_2026 = {
    date(2026, 1, 1): "Tahun Baru Masehi",
    date(2026, 5, 1): "Hari Buruh",
    date(2026, 8, 17): "Hari Kemerdekaan RI",
    date(2026, 12, 25): "Hari Raya Natal",
}

_WEATHER_RULES = {
    # OpenWeather "main" category -> (discount points, impact clause in Bahasa Indonesia)
    "Thunderstorm": (12, "berisiko wisatawan membatalkan kunjungan"),
    "Rain": (10, "berpotensi mengurangi wisatawan"),
    "Drizzle": (8, "berpotensi mengurangi wisatawan luar ruangan"),
    "Snow": (10, "berpotensi mengurangi wisatawan"),
    "Clouds": (-5, "wisata diprediksi ramai karena cuaca nyaman"),
    "Clear": (-5, "wisata diprediksi ramai karena cuaca cerah"),
}
_WEATHER_DEFAULT = (0, "tidak berdampak signifikan terhadap prediksi kunjungan")

DENSITY_HIGH_THRESHOLD = 15
DENSITY_LOW_THRESHOLD = 5


@dataclass
class WeatherSignal:
    condition: str  # OpenWeather "main" category, e.g. "Clouds"
    description: str  # already localized (lang=id), e.g. "awan mendung"
    temp_c: float


@dataclass
class DensitySignal:
    nearby_count: int


@dataclass
class CalendarSignal:
    is_holiday: bool
    holiday_name: Optional[str]
    is_weekend: bool


@dataclass
class InputContribution:
    input_name: str  # "weather" | "calendar" | "density"
    points: Decimal
    fragment: str  # human-readable clause, e.g. "Cuaca: Awan mendung — ..."


@dataclass
class WeightingResult:
    suggested_price: Decimal
    discount_pct: Decimal
    suggestion_type: str  # "discount" | "bundling"
    rationale_text: str
    contributions: list[InputContribution]
    weather_snapshot_json: dict


def fetch_weather(lat: float, lon: float) -> WeatherSignal:
    key = os.environ["OPENWEATHER_API_KEY"]
    resp = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"lat": lat, "lon": lon, "appid": key, "units": "metric", "lang": "id"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return WeatherSignal(
        condition=data["weather"][0]["main"],
        description=data["weather"][0]["description"],
        temp_c=data["main"]["temp"],
    )


def fetch_density(lat: float, lon: float, radius_m: int = 2000) -> DensitySignal:
    key = os.environ["GEOAPIFY_API_KEY"]
    resp = requests.get(
        "https://api.geoapify.com/v2/places",
        params={
            "categories": "tourism",
            "filter": f"circle:{lon},{lat},{radius_m}",
            "limit": 100,
            "apiKey": key,
        },
        timeout=10,
    )
    resp.raise_for_status()
    return DensitySignal(nearby_count=len(resp.json()["features"]))


def check_calendar(on_date: date) -> CalendarSignal:
    holiday_name = NATIONAL_HOLIDAYS_2026.get(on_date)
    return CalendarSignal(
        is_holiday=holiday_name is not None,
        holiday_name=holiday_name,
        is_weekend=on_date.weekday() >= 5,
    )


def _weather_contribution(weather: WeatherSignal) -> InputContribution:
    points, clause = _WEATHER_RULES.get(weather.condition, _WEATHER_DEFAULT)
    fragment = f"Cuaca: {weather.description.capitalize()} — {clause}."
    return InputContribution("weather", Decimal(points), fragment)


def _calendar_contribution(calendar: CalendarSignal) -> InputContribution:
    if calendar.is_holiday:
        label = calendar.holiday_name
        points, clause = -10, "hari libur nasional, permintaan diprediksi tinggi"
    elif calendar.is_weekend:
        label = "Akhir pekan"
        points, clause = -5, "permintaan diprediksi meningkat"
    else:
        label = "Hari biasa"
        points, clause = 0, "tidak ada dampak kalender"
    fragment = f"Kalender: {label} — {clause}."
    return InputContribution("calendar", Decimal(points), fragment)


def _density_contribution(density: DensitySignal, location_label: Optional[str] = None) -> InputContribution:
    n = density.nearby_count
    if n >= DENSITY_HIGH_THRESHOLD:
        points, clause = -8, "area padat tempat wisata, permintaan diprediksi tinggi"
    elif n <= DENSITY_LOW_THRESHOLD:
        points, clause = 6, "area sepi tempat wisata, promo ditingkatkan untuk menarik wisatawan"
    else:
        points, clause = 0, "kepadatan lokasi normal"
    # Names the actual resolved place, not just a bare count, so a merchant
    # can independently check the claim against their own address instead of
    # trusting an opaque number -- see app/geocoding.py's GeocodeResult.label.
    where = f"{location_label} — " if location_label else ""
    fragment = f"Lokasi: {where}{n} tempat wisata di sekitar — {clause}."
    return InputContribution("density", Decimal(points), fragment)


def compute_recommendation(
    listed_price: Decimal,
    hpp: Decimal,
    weather: WeatherSignal,
    density: DensitySignal,
    calendar: CalendarSignal,
    location_label: Optional[str] = None,
) -> WeightingResult:
    contributions = [
        _weather_contribution(weather),
        _calendar_contribution(calendar),
        _density_contribution(density, location_label),
    ]

    discount_pct = BASE_DISCOUNT_PCT + sum((c.points for c in contributions), Decimal(0))
    discount_pct = max(MIN_DISCOUNT_PCT, min(MAX_DISCOUNT_PCT, discount_pct))

    raw_price = listed_price * (Decimal(1) - discount_pct / Decimal(100))
    suggested_price = clamp_to_hpp(raw_price, hpp)
    suggestion_type = "bundling" if suggested_price > raw_price else "discount"

    dominant = max(contributions, key=lambda c: abs(c.points))
    rationale_text = (
        dominant.fragment
        if dominant.points != 0
        else "Tidak ada sinyal cuaca, kalender, atau kepadatan lokasi yang signifikan hari ini; harga mengikuti acuan standar."
    )
    if suggested_price > raw_price:  # guard-rail (CLAUDE.md non-negotiable) clamped it up to HPP
        rationale_text = f"{rationale_text} Rekomendasi disesuaikan agar tetap di atas HPP."

    weather_snapshot_json = {
        "condition": weather.condition,
        "description": weather.description,
        "temp_c": weather.temp_c,
    }

    return WeightingResult(
        suggested_price=suggested_price,
        discount_pct=discount_pct,
        suggestion_type=suggestion_type,
        rationale_text=rationale_text,
        contributions=contributions,
        weather_snapshot_json=weather_snapshot_json,
    )


def generate_recommendation(
    listed_price: Decimal,
    hpp: Decimal,
    lat: float,
    lon: float,
    location_label: Optional[str] = None,
    on_date: Optional[date] = None,
) -> WeightingResult:
    weather = fetch_weather(lat, lon)
    density = fetch_density(lat, lon)
    calendar = check_calendar(on_date or date.today())
    return compute_recommendation(listed_price, hpp, weather, density, calendar, location_label)
