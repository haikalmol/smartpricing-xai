"""Plain assert-based tests for the weighting engine (mock signals, no I/O, no DB).
Run: python tests/test_weighting.py   (also pytest-discoverable if pytest is installed)
"""
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.engine.weighting import (  # noqa: E402
    CalendarSignal,
    DensitySignal,
    WeatherSignal,
    compute_recommendation,
)

CALM_WEEKDAY = CalendarSignal(is_holiday=False, holiday_name=None, is_weekend=False)
NORMAL_DENSITY = DensitySignal(nearby_count=10)


def test_contributions_are_separable_per_input():
    result = compute_recommendation(
        listed_price=Decimal(100000),
        hpp=Decimal(1),
        weather=WeatherSignal("Clear", "cerah", 30.0),
        density=NORMAL_DENSITY,
        calendar=CALM_WEEKDAY,
    )
    names = {c.input_name for c in result.contributions}
    assert names == {"weather", "calendar", "density"}


def test_rain_dominates_and_names_weather_in_rationale():
    result = compute_recommendation(
        listed_price=Decimal(100000),
        hpp=Decimal(1),
        weather=WeatherSignal("Rain", "hujan ringan", 26.0),
        density=NORMAL_DENSITY,
        calendar=CALM_WEEKDAY,
    )
    assert result.rationale_text.startswith("Cuaca:")
    assert result.discount_pct == Decimal(15)  # base 5 + rain's 10 points


def test_holiday_dominates_over_weaker_signals():
    result = compute_recommendation(
        listed_price=Decimal(100000),
        hpp=Decimal(1),
        weather=WeatherSignal("Clouds", "berawan", 28.0),  # -5 points
        density=NORMAL_DENSITY,  # 0 points
        calendar=CalendarSignal(is_holiday=True, holiday_name="Hari Kemerdekaan RI", is_weekend=False),  # -10 points
    )
    assert result.rationale_text.startswith("Kalender:")
    assert "Hari Kemerdekaan RI" in result.rationale_text


def test_all_neutral_gives_generic_rationale():
    result = compute_recommendation(
        listed_price=Decimal(100000),
        hpp=Decimal(1),
        weather=WeatherSignal("Mist", "kabut", 27.0),  # unmapped -> 0 points
        density=NORMAL_DENSITY,
        calendar=CALM_WEEKDAY,
    )
    assert result.discount_pct == Decimal(5)  # base only
    assert result.suggestion_type == "discount"
    assert "Tidak ada sinyal" in result.rationale_text


def test_hpp_guard_rail_clamps_price_and_flips_to_bundling():
    # base 5 + thunderstorm (+12) + quiet density (+6) = 23% off => raw 77000,
    # but hpp is 90000, above the raw discounted price.
    result = compute_recommendation(
        listed_price=Decimal(100000),
        hpp=Decimal(90000),
        weather=WeatherSignal("Thunderstorm", "badai petir", 25.0),
        density=DensitySignal(nearby_count=2),
        calendar=CALM_WEEKDAY,
    )
    assert result.discount_pct == Decimal(23)
    assert result.suggested_price == Decimal(90000)
    assert result.suggestion_type == "bundling"


def test_holiday_lookup_is_date_exact():
    from app.engine.weighting import check_calendar

    signal = check_calendar(date(2026, 8, 17))
    assert signal.is_holiday is True
    assert signal.holiday_name == "Hari Kemerdekaan RI"

    signal = check_calendar(date(2026, 8, 18))
    assert signal.is_holiday is False


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"OK: {t.__name__}")
    print(f"\n{len(tests)} tests passed.")
