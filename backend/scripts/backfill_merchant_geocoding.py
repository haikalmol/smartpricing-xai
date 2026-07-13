"""One-time backfill: geocode existing merchant.location text into the new
latitude/longitude columns (see alembic/versions/85f0f3f21615_merchant_geocoding.py).
Idempotent -- only touches rows where latitude/longitude are still null, so
it's safe to re-run. Run: python scripts/backfill_merchant_geocoding.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.geocoding import geocode_location  # noqa: E402
from app.models import Merchant  # noqa: E402


def main():
    db = SessionLocal()
    merchants = db.query(Merchant).filter(Merchant.latitude.is_(None)).all()
    if not merchants:
        print("No merchants with unresolved coordinates. Nothing to do.")
        return

    for merchant in merchants:
        geocoded = geocode_location(merchant.location)
        before = (merchant.latitude, merchant.longitude)
        if geocoded:
            merchant.latitude, merchant.longitude, merchant.geocoded_label = geocoded.lat, geocoded.lon, geocoded.label
            db.commit()
            print(
                f"[ok] merchant id={merchant.id} business_name={merchant.business_name!r} "
                f"location={merchant.location!r}: before={before} -> "
                f"after=({merchant.latitude}, {merchant.longitude}, label={merchant.geocoded_label!r})"
            )
        else:
            print(
                f"[UNRESOLVED] merchant id={merchant.id} business_name={merchant.business_name!r} "
                f"location={merchant.location!r}: before={before} -> after=(None, None) "
                f"(no confident Aceh match -- location text needs clarifying)"
            )
    db.close()


if __name__ == "__main__":
    main()
