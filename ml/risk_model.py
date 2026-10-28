from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

FEATURE_NAMES = (
    "amount_ratio_to_average",
    "amount_ratio_to_maximum",
    "transfers_last_24h",
    "failed_transfers_last_24h",
    "new_recipient",
)


@dataclass(frozen=True)
class TransactionFeatures:
    amount_ratio_to_average: float
    amount_ratio_to_maximum: float
    transfers_last_24h: int
    failed_transfers_last_24h: int
    new_recipient: int

    def as_vector(self) -> list[float]:
        return [
            self.amount_ratio_to_average,
            self.amount_ratio_to_maximum,
            float(self.transfers_last_24h),
            float(self.failed_transfers_last_24h),
            float(self.new_recipient),
        ]

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def rule_based_label(features: TransactionFeatures) -> int:
    score = 0
    if (
        features.amount_ratio_to_maximum > 1.0
        or features.amount_ratio_to_average > 3.0
    ):
        score += 35
    if features.transfers_last_24h >= 5:
        score += 25
    elif features.transfers_last_24h >= 3:
        score += 15
    if features.failed_transfers_last_24h >= 3:
        score += 25
    if features.new_recipient:
        score += 10
    return int(score >= 60)


def synthetic_label(features: TransactionFeatures) -> int:
    """Generate a hidden, nonlinear label for synthetic evaluation data."""
    signal = (
        0.8 * features.amount_ratio_to_average
        + 0.45 * features.amount_ratio_to_maximum
        + 0.22 * features.transfers_last_24h
        + 0.55 * features.failed_transfers_last_24h
        + 0.35 * features.new_recipient
    )
    interaction = (
        features.amount_ratio_to_average > 4
        and features.failed_transfers_last_24h >= 2
    )
    return int(signal >= 5.2 or interaction)
