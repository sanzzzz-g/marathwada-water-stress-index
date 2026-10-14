import { ModelEvaluationSummary, ModelId, ModelMeta } from '../types/wsi';

export const MODEL_REGISTRY: Record<ModelId, ModelMeta> = {
  Persistence: {
    id: 'Persistence',
    name: 'Persistence (Test Set Champion)',
    family: 'Baseline',
    description: 'Forecast equals the latest observed WSI at origin t: WSI(t+h) = WSI(t). Achieved lowest MAE on the 2021–2024 test split.',
    targetFormulation: 'Direct Target [WSI(t)]',
    inputFeatures: ['WSI(t)'],
    hyperparameters: { lag: 0, trainable_params: 0 },
    isCoreCandidate: true,
  },
  WSI_Autoregression: {
    id: 'WSI_Autoregression',
    name: 'WSI Autoregression (Validation Champion)',
    family: 'Linear Regularized',
    description: 'L2-regularized Ridge model fitted strictly on preceding 12 months of WSI targets [WSI(t-11:t)]. Best model on rolling 20-year backtest.',
    targetFormulation: 'Direct Target [WSI(t+1..t+3)]',
    inputFeatures: ['WSI(t-11:t) univariate trajectory'],
    hyperparameters: { alpha: 10.0, fit_intercept: true, lookback: 12 },
    isCoreCandidate: true,
  },
  Residual_LSTM_ExpB: {
    id: 'Residual_LSTM_ExpB',
    name: 'Residual LSTM (Experiment B)',
    family: 'Deep Learning',
    description: '6-feature small LSTM trained on residual delta: r_{t,h} = WSI(t+h) - WSI(t). Validation MAE: 0.4738 (vs 0.5173 for direct LSTM).',
    targetFormulation: 'Residual Delta [WSI(t+h) - WSI(t)]',
    inputFeatures: ['12-month sequential tensors of 6 standardized z-scores (12, 6)'],
    hyperparameters: { lstm_units: 32, dropout: 0.2, dense_units: 16, loss: 'Huber(delta=1.0)', lr: 0.001 },
    isCoreCandidate: true,
  },
  Ridge_Regression: {
    id: 'Ridge_Regression',
    name: 'Ridge Regression (Multivariate)',
    family: 'Linear Regularized',
    description: 'Linear baseline using flattened 12 x 6 = 72 standardized hydroclimatic features. Standardized on training set.',
    targetFormulation: 'Direct Target [WSI(t+1..t+3)]',
    inputFeatures: ['6 components × 12 lags (72 flattened features)'],
    hyperparameters: { alpha: 1.0, fit_intercept: true },
    isCoreCandidate: true,
  },
  XGBoost: {
    id: 'XGBoost',
    name: 'XGBoost (Independent Horizon Regressors)',
    family: 'Nonlinear Ensemble',
    description: 'Three separate gradient boosted decision tree regressors (XGB_h1, XGB_h2, XGB_h3) with early stopping on validation split.',
    targetFormulation: 'Direct Target [WSI(t+h)]',
    inputFeatures: ['6 components × 12 lags (72 flattened features)'],
    hyperparameters: { max_depth: 3, learning_rate: 0.05, subsample: 0.8, colsample_bytree: 0.8 },
    isCoreCandidate: true,
  },
  Seasonal_Persistence: {
    id: 'Seasonal_Persistence',
    name: 'Seasonal Persistence',
    family: 'Baseline',
    description: 'Historical WSI observed exactly 12 months prior to each forecast horizon: Hat{WSI}_{t+h} = WSI_{t+h-12}.',
    targetFormulation: 'Climatological Seasonal Lag',
    inputFeatures: ['WSI(t+h-12)'],
    hyperparameters: { seasonal_period: 12 },
    isCoreCandidate: true,
  },
  LSTM: {
    id: 'LSTM',
    name: 'Direct LSTM (Experiment A)',
    family: 'Deep Learning',
    description: 'Direct sequence-to-sequence small LSTM predicting WSI levels directly. Underperformed persistence due to La Niña test period shift.',
    targetFormulation: 'Direct Target [WSI(t+1..t+3)]',
    inputFeatures: ['12-month sequential tensors of 6 standardized z-scores (12, 6)'],
    hyperparameters: { lstm_units: 32, dropout: 0.2, dense_units: 16, loss: 'Huber(delta=1.0)' },
    isCoreCandidate: false,
  },
};

export const MODEL_LIST = Object.values(MODEL_REGISTRY);

/**
 * Authoritative Test-set evaluation metrics from repo/results/final_model_comparison.csv
 * and repo/results/baselines/baseline_metrics.csv.
 * Evaluated on the 2021-2024 test split (368 target windows / 1,104 prediction points).
 */
export const MODEL_EVALUATION_SUMMARIES: Record<ModelId, ModelEvaluationSummary> = {
  Persistence: {
    modelId: 'Persistence',
    overallMae: 0.4188,
    overallRmse: 0.5540,
    overallR2: -0.2712,
    overallSkillMae: 0.000, // Reference baseline
    horizons: {
      1: { horizon: 1, mae: 0.3314, rmse: 0.4478, bias: -0.015, r2: 0.1792, n: 368, skillMaeVsPersistence: 0.000 },
      2: { horizon: 2, mae: 0.4379, rmse: 0.5691, bias: -0.024, r2: -0.3397, n: 368, skillMaeVsPersistence: 0.000 },
      3: { horizon: 3, mae: 0.4872, rmse: 0.6295, bias: -0.038, r2: -0.6654, n: 368, skillMaeVsPersistence: 0.000 },
    },
  },
  WSI_Autoregression: {
    modelId: 'WSI_Autoregression',
    overallMae: 0.5068,
    overallRmse: 0.6490,
    overallR2: -0.7445,
    overallSkillMae: -0.2099,
    horizons: {
      1: { horizon: 1, mae: 0.3600, rmse: 0.4827, bias: -0.082, r2: 0.0464, n: 368, skillMaeVsPersistence: -0.0862 },
      2: { horizon: 2, mae: 0.5128, rmse: 0.6533, bias: -0.114, r2: -0.7656, n: 368, skillMaeVsPersistence: -0.1709 },
      3: { horizon: 3, mae: 0.6475, rmse: 0.7770, bias: -0.142, r2: -1.5368, n: 368, skillMaeVsPersistence: -0.3290 },
    },
  },
  Residual_LSTM_ExpB: {
    modelId: 'Residual_LSTM_ExpB',
    overallMae: 0.4738, // Validation MAE (Experiment B Champion)
    overallRmse: 0.6380,
    overallR2: -0.1240,
    overallSkillMae: 0.0798, // +8.0% over Persistence on validation
    horizons: {
      1: { horizon: 1, mae: 0.3538, rmse: 0.4680, bias: 0.008, r2: 0.1120, n: 272, skillMaeVsPersistence: 0.0822 },
      2: { horizon: 2, mae: 0.4884, rmse: 0.6450, bias: 0.012, r2: -0.1850, n: 272, skillMaeVsPersistence: 0.0761 },
      3: { horizon: 3, mae: 0.5792, rmse: 0.7510, bias: 0.015, r2: -0.4200, n: 272, skillMaeVsPersistence: 0.0813 },
    },
  },
  LSTM: {
    modelId: 'LSTM',
    overallMae: 0.5583,
    overallRmse: 0.7260,
    overallR2: -1.1833,
    overallSkillMae: -0.3331,
    horizons: {
      1: { horizon: 1, mae: 0.4258, rmse: 0.5799, bias: -0.098, r2: -0.3766, n: 368, skillMaeVsPersistence: -0.2849 },
      2: { horizon: 2, mae: 0.5650, rmse: 0.7342, bias: -0.142, r2: -1.2300, n: 368, skillMaeVsPersistence: -0.2902 },
      3: { horizon: 3, mae: 0.6841, rmse: 0.8401, bias: -0.185, r2: -1.9661, n: 368, skillMaeVsPersistence: -0.4041 },
    },
  },
  Ridge_Regression: {
    modelId: 'Ridge_Regression',
    overallMae: 0.5628,
    overallRmse: 0.7619,
    overallR2: -1.4047,
    overallSkillMae: -0.3437,
    horizons: {
      1: { horizon: 1, mae: 0.3827, rmse: 0.5398, bias: -0.065, r2: -0.1928, n: 368, skillMaeVsPersistence: -0.1548 },
      2: { horizon: 2, mae: 0.5765, rmse: 0.7692, bias: -0.098, r2: -1.4473, n: 368, skillMaeVsPersistence: -0.3164 },
      3: { horizon: 3, mae: 0.7292, rmse: 0.9266, bias: -0.134, r2: -2.6081, n: 368, skillMaeVsPersistence: -0.4967 },
    },
  },
  XGBoost: {
    modelId: 'XGBoost',
    overallMae: 0.5703,
    overallRmse: 0.7219,
    overallR2: -1.1589,
    overallSkillMae: -0.3617,
    horizons: {
      1: { horizon: 1, mae: 0.4233, rmse: 0.5624, bias: -0.088, r2: -0.2948, n: 368, skillMaeVsPersistence: -0.2774 },
      2: { horizon: 2, mae: 0.5621, rmse: 0.7189, bias: -0.122, r2: -1.1377, n: 368, skillMaeVsPersistence: -0.2835 },
      3: { horizon: 3, mae: 0.7256, rmse: 0.8547, bias: -0.165, r2: -2.0697, n: 368, skillMaeVsPersistence: -0.4894 },
    },
  },
  Seasonal_Persistence: {
    modelId: 'Seasonal_Persistence',
    overallMae: 0.5789,
    overallRmse: 0.7285,
    overallR2: -1.1986,
    overallSkillMae: -0.3822,
    horizons: {
      1: { horizon: 1, mae: 0.5697, rmse: 0.7202, bias: 0.012, r2: -1.1232, n: 368, skillMaeVsPersistence: -0.7191 },
      2: { horizon: 2, mae: 0.5816, rmse: 0.7306, bias: 0.018, r2: -1.2082, n: 368, skillMaeVsPersistence: -0.3280 },
      3: { horizon: 3, mae: 0.5855, rmse: 0.7347, bias: 0.021, r2: -1.2684, n: 368, skillMaeVsPersistence: -0.2019 },
    },
  },
};

/**
 * Authoritative District-level evaluation metrics from repo/results/baselines/district_metrics.csv
 * Scored on the 2021-2024 test split (Persistence Forecaster).
 */
export const DISTRICT_EVALUATION_METRICS_PERSISTENCE: Record<
  string,
  {
    mae: number;
    rmse: number;
    r2: number;
    maeH1: number;
    maeH2: number;
    maeH3: number;
    r2H1: number;
    r2H3: number;
    skillH1: number;
    n: number;
  }
> = {
  beed: { mae: 0.4138, rmse: 0.5496, r2: -0.1120, maeH1: 0.3237, maeH2: 0.4393, maeH3: 0.4784, r2H1: 0.179, r2H3: -0.665, skillH1: 0.000, n: 46 },
  csn: { mae: 0.4808, rmse: 0.6224, r2: -0.3680, maeH1: 0.3682, maeH2: 0.4929, maeH3: 0.5814, r2H1: 0.124, r2H3: -0.712, skillH1: 0.000, n: 46 },
  dharashiv: { mae: 0.4058, rmse: 0.5398, r2: -0.1245, maeH1: 0.3194, maeH2: 0.4372, maeH3: 0.4608, r2H1: 0.185, r2H3: -0.612, skillH1: 0.000, n: 46 },
  hingoli: { mae: 0.3957, rmse: 0.5359, r2: -0.7973, maeH1: 0.3418, maeH2: 0.3968, maeH3: 0.4486, r2H1: 0.112, r2H3: -0.892, skillH1: 0.000, n: 46 },
  jalna: { mae: 0.4638, rmse: 0.6092, r2: -0.2301, maeH1: 0.3375, maeH2: 0.5015, maeH3: 0.5523, r2H1: 0.165, r2H3: -0.645, skillH1: 0.000, n: 46 },
  latur: { mae: 0.3528, rmse: 0.4569, r2: 0.0677, maeH1: 0.2949, maeH2: 0.3551, maeH3: 0.4083, r2H1: 0.245, r2H3: -0.421, skillH1: 0.000, n: 46 },
  nanded: { mae: 0.3877, rmse: 0.5081, r2: -0.4348, maeH1: 0.2997, maeH2: 0.3904, maeH3: 0.4728, r2H1: 0.198, r2H3: -0.589, skillH1: 0.000, n: 46 },
  parbhani: { mae: 0.4504, rmse: 0.5909, r2: -0.7334, maeH1: 0.3660, maeH2: 0.4902, maeH3: 0.4951, r2H1: 0.142, r2H3: -0.812, skillH1: 0.000, n: 46 },
};

/**
 * Backward compatibility alias for district disaggregated evaluation
 */
export const DISTRICT_EVALUATION_METRICS_M5 = DISTRICT_EVALUATION_METRICS_PERSISTENCE;

export interface FeatureImportanceItem {
  feature: string;
  coefficient: number;
  domain: string;
}

/**
 * Standardized feature importance weights from Multivariate Ridge / Autoregression
 */
export const M5_FEATURE_IMPORTANCE: FeatureImportanceItem[] = [
  { feature: 'wsi_t0 (Autoregressive lag-0)', coefficient: -0.342, domain: 'Autoregression' },
  { feature: 'spi_stress_z_t0 (Meteorological deficit)', coefficient: 0.284, domain: 'Meteorology' },
  { feature: 'soil_stress_z_t0 (Root-zone soil deficit)', coefficient: 0.218, domain: 'Soil Moisture' },
  { feature: 'groundwater_stress_z_t0 (Depth-to-water)', coefficient: 0.176, domain: 'Groundwater' },
  { feature: 'lst_stress_z_t0 (Thermal excess anomaly)', coefficient: 0.142, domain: 'Thermal' },
  { feature: 'surface_water_stress_z_t0 (SW frequency)', coefficient: 0.119, domain: 'Surface Water' },
  { feature: 'ndvi_stress_z_t0 (Vegetation condition)', coefficient: 0.098, domain: 'Vegetation' },
  { feature: 'wsi_t_minus_1 (Autoregressive lag-1)', coefficient: -0.065, domain: 'Autoregression' },
];

/**
 * 20-Year Rolling-Origin Backtest Results (2,880 evaluations over 2004–2024)
 * from repo/results/backtesting/rolling_backtest_metrics.csv.
 */
export const ROLLING_BACKTEST_METRICS = [
  { model: 'WSI_Autoregression', evaluations: 2880, overallMae: 0.4187, overallRmse: 0.5643, drought2014_2016Mae: 0.4353, maeH1: 0.3149, maeH2: 0.4294, maeH3: 0.5117, skillVsPersistence: '+5.10%' },
  { model: 'Persistence', evaluations: 2880, overallMae: 0.4412, overallRmse: 0.6038, drought2014_2016Mae: 0.4474, maeH1: 0.3269, maeH2: 0.4530, maeH3: 0.5437, skillVsPersistence: '0.00% (Baseline)' },
  { model: 'XGBoost', evaluations: 2880, overallMae: 0.4570, overallRmse: 0.6012, drought2014_2016Mae: 0.4757, maeH1: 0.3528, maeH2: 0.4720, maeH3: 0.5460, skillVsPersistence: '-3.58%' },
  { model: 'Ridge_Regression', evaluations: 2880, overallMae: 0.4589, overallRmse: 0.6111, drought2014_2016Mae: 0.4602, maeH1: 0.3482, maeH2: 0.4707, maeH3: 0.5578, skillVsPersistence: '-4.01%' },
  { model: 'Seasonal_Persistence', evaluations: 2880, overallMae: 1.0236, overallRmse: 1.2314, drought2014_2016Mae: 1.1394, maeH1: 1.0275, maeH2: 1.0217, maeH3: 1.0216, skillVsPersistence: '-131.98%' },
];

