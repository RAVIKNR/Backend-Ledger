from __future__ import annotations

import csv
import random
from pathlib import Path

from risk_model import FEATURE_NAMES, TransactionFeatures, synthetic_label

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT = DATA_DIR / "synthetic_transactions.csv"


def generate(rows: int = 5000, seed: int = 20261024) -> Path:
    random.seed(seed)
    DATA_DIR.mkdir(exist_ok=True)

    with OUTPUT.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=[*FEATURE_NAMES, "label"])
        writer.writeheader()
        for _ in range(rows):
            features = TransactionFeatures(
                amount_ratio_to_average=round(random.lognormvariate(0, 0.75), 4),
                amount_ratio_to_maximum=round(random.lognormvariate(-0.1, 0.7), 4),
                transfers_last_24h=random.randint(0, 10),
                failed_transfers_last_24h=random.randint(0, 5),
                new_recipient=random.randint(0, 1),
            )
            writer.writerow({**features.as_dict(), "label": synthetic_label(features)})

    return OUTPUT


if __name__ == "__main__":
    print(generate())
