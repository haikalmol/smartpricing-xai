from fastapi import FastAPI

app = FastAPI(title="SmartPricing XAI API")


@app.get("/health")
def health():
    return {"status": "ok"}
