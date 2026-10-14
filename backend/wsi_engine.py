"""
Scientific computation engine for Marathwada WSI calculations & ML residual forecasting.
Supports W0 (equal indicator) and W1 (domain-balanced) weighting schemes.
"""

from typing import Dict, Tuple
import numpy as np

W0_WEIGHTS = {
    'rainfall_stress': 1.0 / 6.0,
    'soil_moisture_stress': 1.0 / 6.0,
    'ndvi_stress': 1.0 / 6.0,
    'lst_stress': 1.0 / 6.0,
    'groundwater_stress': 1.0 / 6.0,
    'surface_water_stress': 1.0 / 6.0,
}

W1_WEIGHTS = {
    'rainfall_stress': 0.25,
    'soil_moisture_stress': 1.0 / 12.0,
    'ndvi_stress': 1.0 / 12.0,
    'lst_stress': 1.0 / 12.0,
    'groundwater_stress': 0.25,
    'surface_water_stress': 0.25,
}

THRESHOLD_MODERATE = 0.5
THRESHOLD_SEVERE = 1.5


def compute_wsi(components: Dict[str, float], scheme: str = 'W0') -> float:
    weights = W0_WEIGHTS if scheme == 'W0' else W1_WEIGHTS
    val = sum(components.get(k, 0.0) * w for k, w in weights.items())
    return round(val, 4)


def get_stress_category(wsi: float) -> str:
    if wsi >= THRESHOLD_SEVERE:
        return 'Severe Stress'
    elif wsi >= THRESHOLD_MODERATE:
        return 'Moderate Stress'
    return 'Low / Normal'


def compute_persistence_skill(mae_model: float, mae_persistence: float) -> float:
    if mae_persistence <= 0:
        return 0.0
    return round(1.0 - (mae_model / mae_persistence), 3)


def compute_residual_forecast(current_wsi: float, predicted_residual: float) -> float:
    return round(max(0.0, current_wsi + predicted_residual), 3)
