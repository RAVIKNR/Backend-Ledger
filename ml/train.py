from __future__ import annotations

import csv
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from generate_data import OUTPUT, generate
from risk_model import FEATURE_NAMES, TransactionFeatures, rule_based_label

ROOT = Path(__file__).resolve().parent
ARTIFACT = ROOT / "artifacts" / "risk_model.joblib"
REPORT = ROOT / "artifacts" / "evaluation.json"


def load_rows() -> tuple[np.ndarray, np.ndarray]:
    if not OUTPUT.exists():
        generate()
    with OUTPUT.open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))
    features = np.array(
        [[float(row[name]) for name in FEATURE_NAMES] for row in rows],
        dtype=float,
    )
    labels = np.array([int(row["label"]) for row in rows], dtype=int)
    return features, labels


def metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    true_negative, false_positive, false_negative, true_positive = confusion_matrix(
        actual, predicted, labels=[0, 1]
    ).ravel()
    return {
        "precision": round(float(precision_score(actual, predicted, zero_division=0)), 4),
        "recall": round(float(recall_score(actual, predicted, zero_division=0)), 4),
        "false_positive_rate": round(
            float(false_positive / max(true_negative + false_positive, 1)), 4
        ),
    }


def train_and_evaluate() -> dict:
    features, labels = load_rows()
    x_train, x_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.25, random_state=20261024, stratify=labels
    )
    model = Pipeline(
        [
            ("scale", StandardScaler()),
            ("classifier", LogisticRegression(random_state=20261024, max_iter=1000)),
        ]
    )
    model.fit(x_train, y_train)

    model_predictions = model.predict(x_test)
    rule_predictions = np.array(
        [
            rule_based_label(TransactionFeatures(*row))
            for row in x_test
        ],
        dtype=int,
    )
    report = {
        "dataset": {
            "rows": int(len(labels)),
            "test_rows": int(len(y_test)),
            "positive_rate": round(float(labels.mean()), 4),
        },
        "rule_based_baseline": metrics(y_test, rule_predictions),
        "logistic_regression": metrics(y_test, model_predictions),
        "comparison": {
            "measured_on_held_out_data": True,
            "improvement_in_precision": round(
                metrics(y_test, model_predictions)["precision"]
                - metrics(y_test, rule_predictions)["precision"],
                4,
            ),
            "improvement_in_recall": round(
                metrics(y_test, model_predictions)["recall"]
                - metrics(y_test, rule_predictions)["recall"],
                4,
            ),
        },
    }

    ARTIFACT.parent.mkdir(exist_ok=True)
    joblib.dump(model, ARTIFACT)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    print(json.dumps(train_and_evaluate(), indent=2))
