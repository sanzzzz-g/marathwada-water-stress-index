"""
Pydantic Schemas for Marathwada WSI Intelligence Platform API
Conforms to Section 17 of the Master Specification.
"""

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

DistrictIdType = Literal['csn', 'jalna', 'beed', 'dharashiv', 'latur', 'nanded', 'parbhani', 'hingoli']
WeightingSchemeType = Literal['W0', 'W1', 'custom']
StressCategoryType = Literal['Low / Normal', 'Moderate Stress', 'Severe Stress']
ForecastHorizonType = Literal[1, 2, 3]


class WsiComponentsSchema(BaseModel):
    rainfall_stress: float = Field(..., ge=0.0, le=5.0, description="Normalized rainfall deficit")
    soil_moisture_stress: float = Field(..., ge=0.0, le=5.0, description="Root-zone soil moisture deficit")
    ndvi_stress: float = Field(..., ge=0.0, le=5.0, description="Inverted VCI vegetation stress")
    lst_stress: float = Field(..., ge=0.0, le=5.0, description="Land surface thermal anomaly")
    groundwater_stress: float = Field(..., ge=0.0, le=5.0, description="Depth-to-water depletion")
    surface_water_stress: float = Field(..., ge=0.0, le=5.0, description="Surface reservoir deficit")


class WsiRecordSchema(BaseModel):
    date: str
    year: int
    month: int
    district_id: DistrictIdType
    district_name: str
    components: WsiComponentsSchema
    wsi_w0: float
    wsi_w1: float
    category_w0: StressCategoryType
    category_w1: StressCategoryType
    reservoir_storage_pct: Optional[float] = None
    data_quality_flag: str = "verified"


class DistrictInfoSchema(BaseModel):
    id: DistrictIdType
    name: str
    former_name: Optional[str] = None
    marathi_name: str
    headquarters: str
    area_sq_km: float
    population_2011: int
    coordinates: List[float]
    primary_reservoir: str
    vulnerability_tier: str
    baseline_aridity_index: float


class ForecastRecordSchema(BaseModel):
    district_id: DistrictIdType
    forecast_origin: str
    target_date: str
    horizon: ForecastHorizonType
    model_id: str
    predicted_wsi: float
    predicted_residual: float
    lower_interval_90: Optional[float] = None
    upper_interval_90: Optional[float] = None
    stress_category: StressCategoryType


class RegressionMetricsSchema(BaseModel):
    horizon: ForecastHorizonType
    mae: float
    rmse: float
    bias: float
    r2: float
    n: int
    skill_mae_vs_persistence: float
    high_stress_mae: Optional[float] = None


class ModelSummarySchema(BaseModel):
    model_id: str
    overall_mae: float
    overall_rmse: float
    overall_r2: float
    overall_skill_mae: float
    horizons: Dict[int, RegressionMetricsSchema]


class SimulationIndexRequest(BaseModel):
    district_id: DistrictIdType
    weight_scheme: WeightingSchemeType = "W0"
    baseline_components: WsiComponentsSchema
    perturbations: Dict[str, float]


class SimulationIndexResponse(BaseModel):
    baseline_wsi: float
    simulated_wsi: float
    delta_wsi: float
    baseline_category: StressCategoryType
    simulated_category: StressCategoryType
    simulated_components: WsiComponentsSchema
    disclaimer: str = "Simulated scenario — not an observed event or validated operational forecast."


class SimulationForecastRequest(BaseModel):
    district_id: DistrictIdType
    horizon: ForecastHorizonType
    current_wsi: float
    perturbations: Dict[str, float]


class SimulationForecastResponse(BaseModel):
    baseline_predicted_wsi: float
    simulated_predicted_wsi: float
    delta_predicted_wsi: float
    baseline_category: StressCategoryType
    simulated_category: StressCategoryType
    disclaimer: str = "Simulated scenario — not an observed event or validated operational forecast."
