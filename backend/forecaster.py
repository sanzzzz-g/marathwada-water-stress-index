"""
WSI forecaster: persistence (WSI(t+h) = WSI(t)).

Persistence is the best validated model at h1-h3 (results/final_model_comparison.csv).
Damped persistence fitted on train (phi=0.83) was tested and lost on 2021-2024
(-1.7% / -2.4% / -7.1% MAE skill), because the test period sat persistently wet
(mean WSI -1.02) instead of reverting to 0.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

import pandas as pd

DATA_PATH = Path(__file__).resolve().parent.parent / "repo" / "outputs" / "Marathwada_MODEL_DATASET_2003_2024.csv"

DISTRICT_NAMES = {
    "csn": "Chhatrapati Sambhajinagar",
    "jalna": "Jalna",
    "beed": "Beed",
    "latur": "Latur",
    "dharashiv": "Dharashiv",
    "nanded": "Nanded",
    "parbhani": "Parbhani",
    "hingoli": "Hingoli",
}


def classify_wsi(wsi: float) -> str:
    if wsi < -1.5:
        return "Very Wet"
    if wsi < -0.5:
        return "Wet"
    if wsi < 0.5:
        return "Normal"
    if wsi < 1.5:
        return "Moderate Stress"
    return "Severe Stress"


@lru_cache(maxsize=1)
def _load() -> pd.DataFrame:
    return pd.read_csv(DATA_PATH, parse_dates=["date"])


def forecast_district(district_id: str, horizons: int = 3) -> List[dict]:
    df = _load()
    last = df[df["district"] == DISTRICT_NAMES[district_id]].sort_values("date").iloc[-1]
    origin, wsi_now = last["date"], round(float(last["wsi"]), 3)
    return [
        {
            "district_id": district_id,
            "horizon": h,
            "origin_date": origin.strftime("%Y-%m"),
            "target_date": (origin + pd.DateOffset(months=h)).strftime("%Y-%m"),
            "predicted_wsi": wsi_now,
            "predicted_residual": 0.0,
            "stress_category": classify_wsi(wsi_now),
            "model": "persistence",
        }
        for h in range(1, horizons + 1)
    ]
