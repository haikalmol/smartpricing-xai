from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import recommendations, services

app = FastAPI(title="SmartPricing XAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services.router)
app.include_router(recommendations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
