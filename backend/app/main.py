import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# app.routers -> ... -> app.database, which loads .env at import time (see
# app/database.py) -- no need to load it again here, same convention as
# app/engine/weighting.py.
from app.routers import auth, merchants, recommendations, services

app = FastAPI(title="SmartPricing XAI API")

# Dev origins always allowed so local frontend dev keeps working against a
# deployed backend if ever needed. FRONTEND_URL (unset locally, set on
# Render once the frontend service's real URL is known -- see render.yaml)
# is appended rather than replacing them, so this is additive, not a switch.
_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
_frontend_url = os.environ.get("FRONTEND_URL")
allow_origins = _DEV_ORIGINS + [_frontend_url] if _frontend_url else _DEV_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services.router)
app.include_router(recommendations.router)
app.include_router(merchants.router)
app.include_router(auth.router)


@app.get("/health")
def health():
    return {"status": "ok"}
