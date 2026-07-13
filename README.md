# SmartPricing XAI

A mobile-first website for Aceh tourism UMKM (homestay, motorbike rental,
tour guides) that gives smart promo & bundling price recommendations backed
by Explainable AI, each one shipped with a plain-language rationale ("Alasan
Algoritma") and a mandatory approve/reject step before any price change —
never applied automatically. Built for a PKM-BMD/BP grant, Universitas
Muhammadiyah Aceh.

See [CLAUDE.md](./CLAUDE.md) for the full project context: non-negotiables,
free-tier infra constraints, tech stack, core algorithm, and data model.
This README focuses on how to run the project and how the repo is laid out.

## Status

The backend, core frontend, auth system, and location/geocoding fixes are
live against a real Supabase database (see commit history `H01`–`H22`,
`PATCH-01` through `PATCH-03`). A separate explainability research track
(`/ai`, stages `AI-01`–`AI-07`) has produced SHAP figures and a sensitivity
analysis for Paper B, but has never been and will never be deployed with the
main app. Real mitra (partner) testing (H16–H17 in a separate work plan)
hasn't started yet — merchant data in Supabase today is still internal test
data ("Najwa" / "Burgerlah"), not real Aceh tourism UMKM data.

## Repo structure

```
smartpricingxai/
├── backend/          FastAPI + PostgreSQL (Supabase), production API
├── frontend/         React + Vite, mobile-first website
├── ai/               Separate XAI research pipeline for Paper B — NEVER deployed
├── CLAUDE.md          Project rules & context binding all work in this repo
└── syaratketentuan.md Terms & Conditions text, rendered directly in Akun
```

## Running locally

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows; source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env        # fill in API keys, Supabase credentials, and SECRET_KEY
uvicorn app.main:app --reload
```

Without `DB_USER`/`DB_PASSWORD`/`DB_HOST` (or `DATABASE_URL`) set in `.env`,
`app/database.py` automatically falls back to local SQLite
(`smartpricing.db`) — fine for development, but not the real Supabase data.

Database migrations use Alembic (`backend/alembic/versions/`):

```bash
alembic upgrade head
```

Run tests (plain assert, no framework, see `backend/tests/`):

```bash
python tests/test_weighting.py   # recommendation engine, pure, no I/O
python tests/test_auth.py        # password hashing & JWT
```

Smoke-test the external APIs (OpenWeather, Geoapify) before relying on live
recommendations:

```bash
python scripts/test_apis.py
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Production build: `npm run build` (outputs to `frontend/dist/`). The
frontend reads `VITE_API_BASE_URL` (default `http://localhost:8000`) to
locate the backend.

### `/ai` — research pipeline (optional, fully separate)

Only needed for Paper B work, not for running the app:

```bash
cd ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Full details (dataset, limitations, how to reproduce each stage) are in
[ai/README.md](./ai/README.md) — including an explicit warning that the
model here is validated against external Bali data, not Aceh data, and does
not cover the motorbike-rental / tour-guide categories.

## Backend architecture

```
backend/app/
├── main.py              FastAPI app, CORS, health check, router registration
├── database.py          DB connection (Supabase/SQLite), loads .env
├── models.py             SQLAlchemy models: Merchant, Service, Recommendation
├── schemas.py            Pydantic request/response schemas
├── auth.py               Password hashing (bcrypt), JWT (pyjwt), get_current_merchant
├── geocoding.py           Free-text address geocoding via Geoapify (fallback, see note below)
├── maps_link.py           Parses the Google Maps link a merchant pastes (primary way to set lat/lon)
├── recommendation.py      HPP guard-rail + Recommendation row construction
├── engine/weighting.py    Rule-based recommendation algorithm (see below)
└── routers/
    ├── auth.py            POST /auth/register, /auth/login, DELETE /auth/account
    ├── merchants.py        GET/PUT /merchants/me, GET /merchants/me/stats
    ├── services.py         GET/POST /services, PUT /services/{id}/hpp, DELETE /services/{id}
    └── recommendations.py  GET /recommendations/current, /pending, POST /recommendations/{id}/respond
```

### Core algorithm: rule-based, not an ML model

`app/engine/weighting.py` derives a recommendation from three independent
signals — weather (OpenWeather), local calendar (holidays/weekends), and
location density (Geoapify Places) — each contributing a signed discount
point value and one Bahasa Indonesia rationale fragment.
`compute_recommendation()` is pure (no I/O), so it's testable with mock
signals; `generate_recommendation()` is the wrapper that actually calls the
live APIs. The rationale shown to a merchant **is** the computation itself,
not an approximation of it — see `ai/outputs/tables/xai_comparison.md` for a
formal comparison against the SHAP-ML pipeline in `/ai`, and the reasoning
behind launching with the rule-based engine as the primary mechanism.

HPP guard-rail (`app/recommendation.py`): `suggested_price` may never fall
below `service.hpp`, enforced twice — once inside the engine, once again
right before the `Recommendation` row is persisted — so a future algorithm
that forgets to call `clamp_to_hpp()` still can't violate it.

### Merchant location: Google Maps link, not free-text address

Location was originally geocoded from free-text address input
(`app/geocoding.py`, via the Geoapify Geocoding API). This proved unreliable
on detailed real Indonesian addresses (a genuine street address in Kuta
Alam, Banda Aceh resolved at only 0.17 confidence and was correctly
rejected — see commit `H21`). The primary mechanism now: a merchant pastes a
Google Maps link (long link, short `maps.app.goo.gl` link, or a link with a
`q=`/`query=`/`center=` parameter) into Edit Profil, parsed server-side by
`app/maps_link.py` — including following short-link redirects and
prioritizing the pinned coordinate (`!3d`/`!4d`) over the map viewport
center (`@lat,lon`), since the two can differ meaningfully on real links. A
link that can't be parsed **never** falls back to a default location — the
API rejects it with HTTP 422 and a clear message to the merchant.

## Data model

```
merchant       id, name, business_name, location, email, password_hash,
               is_active, latitude, longitude, geocoded_label
service        id, merchant_id, name, listed_price, hpp, is_active
recommendation id, service_id, suggested_price, rationale_text,
               weather_snapshot_json, status, created_at, responded_at
```

`is_active` on `merchant` and `service` is a soft-delete — approve/reject
history must stay intact for Paper A's adoption metrics, so it's never
permanently deleted through normal user actions.

## Environment variables (backend/.env)

| Variable | Purpose |
|---|---|
| `OPENWEATHER_API_KEY` | Weather signal for the recommendation engine |
| `GEOAPIFY_API_KEY` | Location density (Places) + fallback geocoding |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | Supabase credentials (auto percent-encoded) |
| `DATABASE_URL` | Alternative, direct override — what Render/Railway inject at deploy time |
| `SECRET_KEY` | Login JWT signing key — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |

All secrets live in `.env`, gitignored since the first commit — never commit
a real key.

## Commit convention

One commit per task, with an ID that maps directly to the grant logbook:
`H01`–`H22` for the main app's build stages (see `git log` for the full
sequence), `AI-01`–`AI-07` for the `/ai` research pipeline, and `PATCH-01`
onward for fixes that fall outside the original numbered work plan.
