# Optional ML risk model

This component is deliberately separate from the Node.js accounting and
rule-based risk engine. It provides measured experimentation only; it does not
post transfers, change ledger entries, or override the production rule engine.

Requires Python 3.10 or newer.

## Train and evaluate

From this directory:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python generate_data.py
python train.py
```

`train.py` writes:

- `data/synthetic_transactions.csv`
- `artifacts/risk_model.joblib`
- `artifacts/evaluation.json`

The evaluation uses a deterministic held-out test split and reports precision,
recall, and false-positive rate for both the existing rule-based baseline and
logistic regression. Review `artifacts/evaluation.json` before considering
model use; synthetic results do not prove production improvement.

## Run the optional service

```powershell
uvicorn app:app --host 127.0.0.1 --port 8001
```

`GET /health` reports whether a trained artifact is present. `POST /predict`
returns a probability and prediction. If no artifact exists, prediction
requests return `503` rather than silently falling back to a model that was
never evaluated.
