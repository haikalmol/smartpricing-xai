"""Standalone smoke test for OpenWeather + Geoapify Places. Run: python scripts/test_apis.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.engine.weighting import fetch_density, fetch_weather  # noqa: E402

BANDA_ACEH = {"lat": 5.5483, "lon": 95.3238}


def test_openweather():
    weather = fetch_weather(BANDA_ACEH["lat"], BANDA_ACEH["lon"])
    print(f"[OpenWeather] Banda Aceh: {weather.description}, {weather.temp_c}°C")


def test_geoapify():
    density = fetch_density(BANDA_ACEH["lat"], BANDA_ACEH["lon"])
    print(f"[Geoapify] Banda Aceh (tourism places within 2000m): {density.nearby_count} places")


if __name__ == "__main__":
    test_openweather()
    test_geoapify()
