export type DistrictId =
  | 'csn' // Chhatrapati Sambhajinagar (formerly Aurangabad)
  | 'jalna'
  | 'beed'
  | 'dharashiv' // Dharashiv (formerly Osmanabad)
  | 'latur'
  | 'nanded'
  | 'parbhani'
  | 'hingoli';

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  formerName?: string;
  marathiName: string;
  headquarters: string;
  areaSqKm: number;
  population2011: number;
  coordinates: [number, number]; // [lat, lng]
  primaryReservoir: string;
  vulnerabilityTier: 'High' | 'Very High' | 'Severe';
  baselineAridityIndex: number;
}

/**
 * Authoritative 5 categories from repository:
 * repo/src/wsi.py & repo/artifacts/preprocessing_metadata.json
 * - Very Wet: WSI < -1.5
 * - Wet: -1.5 <= WSI < -0.5
 * - Normal: -0.5 <= WSI < 0.5
 * - Moderate Stress: 0.5 <= WSI < 1.5
 * - Severe Stress: WSI >= 1.5
 */
export type StressCategory =
  | 'Very Wet'
  | 'Wet'
  | 'Normal'
  | 'Moderate Stress'
  | 'Severe Stress';

export type WeightingScheme = 'W0' | 'W1' | 'W1_experimental';

export interface WsiComponents {
  spiStressZ: number; // Inverted Standardized Precipitation Index (-SPI3) [-3.0 to +3.0]
  soilStressZ: number; // Root-zone soil moisture standardized deficit [-3.0 to +3.0]
  ndviStressZ: number; // MODIS NDVI standardized deficit [-3.0 to +3.0]
  lstStressZ: number; // Land surface temperature daytime standardized thermal anomaly [-3.0 to +3.0]
  groundwaterStressZ: number; // GSDA depth-to-water standardized anomaly [-3.0 to +3.0]
  surfaceWaterStressZ: number; // Global WaterPack surface water fraction standardized deficit [-3.0 to +3.0]

  // Aliases for compatibility
  rainfallStress?: number;
  soilMoistureStress?: number;
  ndviStress?: number;
  lstStress?: number;
  groundwaterStress?: number;
  surfaceWaterStress?: number;
}

export interface WsiRecord {
  date: string; // YYYY-MM
  year: number;
  month: number;
  split: 'train' | 'val' | 'test';
  districtId: DistrictId;
  districtName: string;
  components: WsiComponents;
  wsi: number; // Authoritative equal 1/6 indicator WSI
  wsi_w0: number;
  wsi_w1: number;
  wsi_w1_experimental?: number; // Domain-weighted sensitivity experiment
  category: StressCategory;
  category_w0: StressCategory;
  category_w1: StressCategory;
  groundwaterStaleFlag?: number;
  monthsSinceLastGwObs?: number;
  ndviImputed?: number;
  lstImputed?: number;
  reservoirStoragePct?: number;
  dataQualityFlag: 'verified' | 'imputed' | 'gw_propagated';
}

export type ForecastHorizon = 1 | 2 | 3; // h = 1, 2, 3 months ahead

export interface ModelPrediction {
  districtId: DistrictId;
  forecastOrigin: string; // YYYY-MM
  targetDate: string; // YYYY-MM
  horizon: ForecastHorizon;
  modelId: ModelId;
  predictedWsi: number;
  actualWsi?: number;
  error?: number;
  squaredError?: number;
  stressCategory: StressCategory;
  predictedResidual?: number;
  lowerInterval90?: number;
  upperInterval90?: number;
}

export type ModelId =
  | 'Persistence'
  | 'WSI_Autoregression'
  | 'Ridge_Regression'
  | 'XGBoost'
  | 'Seasonal_Persistence'
  | 'LSTM'
  | 'Residual_LSTM_ExpB';

export interface ModelMeta {
  id: ModelId;
  name: string;
  family: 'Baseline' | 'Linear Regularized' | 'Nonlinear Ensemble' | 'Deep Learning';
  description: string;
  targetFormulation: string;
  inputFeatures: string[];
  hyperparameters: Record<string, string | number | boolean>;
  isCoreCandidate: boolean;
}

export interface ModelHorizonMetrics {
  horizon: ForecastHorizon;
  mae: number;
  rmse: number;
  bias: number;
  r2: number;
  n: number;
  skillMaeVsPersistence: number; // 1 - MAE_model / MAE_persistence
  highStressMae?: number;
}

export interface ModelEvaluationSummary {
  modelId: ModelId;
  overallMae: number;
  overallRmse: number;
  overallR2: number;
  overallSkillMae: number;
  horizons: Record<ForecastHorizon, ModelHorizonMetrics>;
}

export interface ScarcityValidationRecord {
  year: number;
  month: number;
  date: string;
  districtId: DistrictId;
  districtName: string;
  tankersDeployed: number;
  scarcityVillagesReported?: number;
  officialDeclaration?: boolean;
  declarationDetails?: string;
  actualWsi: number;
  predictedWsiM5: number;
  detectedByWsi?: boolean;
  contingencyOutcome?: 'HIT' | 'MISS' | 'FALSE_ALARM' | 'CORRECT_NEGATIVE';
}

export interface SimulationScenarioState {
  id: string;
  name: string;
  districtId: DistrictId;
  weightScheme: WeightingScheme;
  mode: 'MODE_A_INDEX' | 'MODE_B_FORECAST';
  baselineComponents: WsiComponents;
  perturbations: {
    spiStressDelta: number;
    soilStressDelta: number;
    ndviStressDelta: number;
    lstStressDelta: number;
    groundwaterStressDelta: number;
    surfaceWaterStressDelta: number;
  };
  simulatedComponents: WsiComponents;
  baselineWsi: number;
  simulatedWsi: number;
  deltaWsi: number;
  baselineCategory: StressCategory;
  simulatedCategory: StressCategory;
  timestamp: string;
}

export interface DatasetManifest {
  name: string;
  fileName: string;
  sourceRepo: string;
  commitSha: string;
  timeRange: string;
  rowCount: number;
  districtCount: number;
  units: Record<string, string>;
  missingDataPolicy: string;
  knownLimitations: string[];
  lastAuditDate: string;
}
