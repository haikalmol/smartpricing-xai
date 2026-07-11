"""Standalone smoke test for OpenWeather + Geoapify Places. Run: python scripts/test_apis.py"""
import os

import requests
from dotenv import load_dotenv

load_dotenv()

BANDA_ACEH = {"lat": 5.5483, "lon": 95.3238}


def test_openweather():
    key = os.environ["OPENWEATHER_API_KEY"]
    resp = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"lat": BANDA_ACEH["lat"], "lon": BANDA_ACEH["lon"], "appid": key, "units": "metric"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    weather = data["weather"][0]["description"]
    temp = data["main"]["temp"]
    print(f"[OpenWeather] Banda Aceh: {weather}, {temp}°C")


def test_geoapify():
    key = os.environ["GEOAPIFY_API_KEY"]
    radius_m = 2000
    resp = requests.get(
        "https://api.geoapify.com/v2/places",
        params={
            "categories": "tourism",
            "filter": f"circle:{BANDA_ACEH['lon']},{BANDA_ACEH['lat']},{radius_m}",
            "limit": 100,
            "apiKey": key,
        },
        timeout=10,
    )
    resp.raise_for_status()
    count = len(resp.json()["features"])
    print(f"[Geoapify] Banda Aceh (tourism places within {radius_m}m): {count} places")


if __name__ == "__main__":
    test_openweather()
    test_geoapify()
