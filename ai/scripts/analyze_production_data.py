"""Production-data adoption analysis for Paper A (Stage 5) -- INERT.

Do not wire this into any pipeline or run it for a real report yet. H16-H17
(mitra pilot testing) haven't happened -- today the merchant/service/
recommendation tables hold only the developer's own seed/test account, not
real merchant adoption behavior. Computing approve/reject rates on that would
produce numbers that *look* like findings but describe nobody's real usage.
Per CLAUDE.md's "/ai folder" section: "don't build that analysis early with
fake data standing in for real results." This module exists so the wiring is
ready the moment real data exists (~Nov), not so it can be run today.

Reuses backend/app/models.py and backend/app/database.py directly (sys.path
trick below) instead of redefining the schema here -- one source of truth
for what a Merchant/Service/Recommendation row looks like.

Read-only by convention: nothing in this module calls session.add/commit/
delete. Keep it that way -- this connects to the same Supabase database the
live backend writes to.

Wire in for real once H16-H17 pilot testing has produced enough
recommendation history to be worth reporting on.
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal  # noqa: E402
from app.models import Merchant, Recommendation, Service  # noqa: E402


def get_session():
    """Session against whatever DATABASE_URL backend/.env resolves to (Supabase in production)."""
    return SessionLocal()


def compute_approval_rates(session):
    """Per-merchant approve/reject/pending counts and approval rate.

    Placeholder logic for Stage 5 -- not called anywhere yet, see module
    docstring. Written now so the query is ready, not so it gets run today.
    """
    rows = (
        session.query(Merchant.id, Merchant.business_name, Recommendation.status)
        .join(Service, Service.merchant_id == Merchant.id)
        .join(Recommendation, Recommendation.service_id == Service.id)
        .all()
    )

    by_merchant = {}
    for merchant_id, business_name, status in rows:
        bucket = by_merchant.setdefault(
            merchant_id,
            {"business_name": business_name, "approved": 0, "rejected": 0, "pending": 0},
        )
        bucket[status.value] += 1

    results = []
    for merchant_id, counts in by_merchant.items():
        responded = counts["approved"] + counts["rejected"]
        approval_rate = counts["approved"] / responded if responded else None
        results.append({"merchant_id": merchant_id, **counts, "approval_rate": approval_rate})
    return results


def main():
    print(
        "[inert] analyze_production_data.py is a stub -- it does not run any analysis.\n"
        "Real mitra pilot data doesn't exist yet (H16-H17 pending, ~Nov).\n"
        "Once it does: session = get_session(); compute_approval_rates(session)."
    )


if __name__ == "__main__":
    main()
