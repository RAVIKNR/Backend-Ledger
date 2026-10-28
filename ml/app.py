from __future__ import annotations

from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
ARTIFACT = ROOT / "artifacts" / "risk_model.joblib"
app = FastAPI(title="LedgerGuard ML Risk Service", version="1.0.0")


class PredictionRequest(BaseModel):
    amount_ratio_to_average: float = Field(ge=0)
    amount_ratio_to_maximum: float = Field(ge=0)
    transfers_last_24h: int = Field(ge=0)
    failed_transfers_last_24h: int = Field(ge=0)
    new_recipient: int = Field(ge=0, le=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model_loaded": str(ARTIFACT.exists()).lower()}


@app.post("/predict")
def predict(request: PredictionRequest) -> dict[str, float | int | str]:
    if not ARTIFACT.exists():
        raise HTTPException(
            status_code=503,
            detail="ML model is not trained. Run python train.py first.",
        )

    model = joblib.load(ARTIFACT)
    features = [[
        request.amount_ratio_to_average,
        request.amount_ratio_to_maximum,
        request.transfers_last_24h,
        request.failed_transfers_last_24h,
        request.new_recipient,
    ]]
    probability = float(model.predict_proba(features)[0][1])
    prediction = int(probability >= 0.5)
    return {
        "risk": "HIGH" if prediction else "LOW",
        "prediction": prediction,
        "probability": round(probability, 4),
    }
