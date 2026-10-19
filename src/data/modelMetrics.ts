import { ModelEvaluationSummary, ModelId, ModelMeta } from '../types/wsi';
import { RESIDUAL_CONFIG, residualSummary } from './residualMlFix';

export const MODEL_REGISTRY: Record<ModelId, ModelMeta> = {
  Persistence: {
    id: 'Persistence',
    name: 'Persistence (Reference Model)',
    family: 'Baseline',
    description: 'Forecast equals the latest observed WSI at origin t: WSI(t+h) = WSI(t). MAE 0.4221 on the 2021–2024 test split (data_model_v2); production reference. Residual Ridge + SEAS5 scores lower (0.3975) but the gain is not statistically significant (p = 0.26).',
    targetFormulation: 'Direct Target [WSI(t)]',
    inputFeatures: ['WSI(t)'],
    hyperparameters: { lag: 0, trainable_params: 0 },
    isCoreCandidate: true,
  },
  WSI_Autoregression: {
    id: 'WSI_Autoregression',
    name: 'WSI Autoregression (Validation Champion)',
    family: 'Linear Regularized',
    description: 'L2-regularized Ridge model fitted strictly on preceding 12 months of WSI targets [WSI(t-11:t)]. Top-performing model on 2018–2020 validation (Val MAE: 0.4702, Val R²: 0.5404, +8.68% over Persistence). Test MAE: 0.5011.',
    targetFormulation: 'Direct Target [WSI(t+1..t+3)]',
    inputFeatures: ['WSI(t-11:t) univariate trajectory'],
    hyperparameters: { alpha: 10.0, fit_intercept: true, lookback: 12 },
    isCoreCandidate: true,
  },
  Residual_LSTM_ExpB: {
    id: 'Residual_LSTM_ExpB',
    name: 'Residual LSTM (Exp B - Reproduced)',
    family: 'Deep Learning',
    description: '6-feature small LSTM trained on residual delta: r_{t,h} = WSI(t+h) - WSI(t). Evaluated via reproducible retraining on data_model_v2 (seed 42, validation early-stopping at epoch 3). Evaluated on all 368 test windows (2021–2024).',
    targetFormulation: 'Residual Delta [WSI(t+h) - WSI(t)]',
    inputFeatures: ['12-month sequential tensors of 6 standardized z-scores (12, 6)'],
    hyperparameters: { lstm_units: 32, dropout: 0.2, dense_units: 16, loss: 'Huber(delta=1.0)', lr: 0.001, seed: 42, early_stop_epoch: 3 },
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
    description: 'Direct sequence-to-sequence LSTM predicting WSI levels directly. Evaluated exclusively on historical v1 dataset (360 windows). No valid predictions on data_model_v2; test metrics marked unavailable on v2.',
    targetFormulation: 'Direct Target [WSI(t+1..t+3)]',
    inputFeatures: ['12-month sequential tensors of 6 standardized z-scores (12, 6)'],
    hyperparameters: { lstm_units: 32, dropout: 0.2, dense_units: 16, loss: 'Huber(delta=1.0)', seed: 42, best_epoch: 6 },
    isCoreCandidate: false,
  },
  AR_Persistence_Ensemble: {
    id: 'AR_Persistence_Ensemble',
    name: 'AR-12 + Persistence Ensemble',
    family: 'Linear Regularized',
    description: 'Validation-trained horizon ensemble blending WSI-AR(12) and Persistence: alpha_h * AR + (1 - alpha_h) * Pers. Weights learned strictly on pooled 2018–2020 validation (alpha_1=1.000, alpha_2=0.763, alpha_3=0.793). Achieved lowest overall validation MAE (0.4655, +9.60% skill over Persistence).',
    targetFormulation: 'Horizon-Specific Linear Blend [alpha_h * AR + (1 - alpha_h) * Pers]',
    inputFeatures: ['WSI(t-11:t) autoregressive trajectory', 'WSI(t) origin persistence'],
    hyperparameters: { alpha_h1: 1.000, alpha_h2: 0.763, alpha_h3: 0.793, weights_constraint: '[0.0, 1.0]', objective: 'MAE' },
    isCoreCandidate: true,
  },
  Ridge_Delta_Rolling: {
    id: 'Ridge_Delta_Rolling',
    name: 'Ridge Residual (Rolling Refit)',
    family: 'Linear Regularized',
    description: 'Ridge trained on residual targets WSI(t+h) - WSI(t), shrunk toward persistence (w=0.6, tuned on 2018–2020 validation) and refit at every forecast origin on all sequences whose targets are already observed. Beats Persistence on the 2021–2024 test split by +3.49% MAE skill; margin is small. Source: repo/src/residual_ml_fix.py.',
    targetFormulation: 'Shrunk Residual [WSI(t) + w * r_hat(t,h)]',
    inputFeatures: ['6 stress components (t-11:t)', 'Calendar month (sin/cos)'],
    hyperparameters: { alpha: RESIDUAL_CONFIG.Ridge_delta.alpha ?? 'n/a', shrink_w: RESIDUAL_CONFIG.Ridge_delta.shrink_w, refit: 'every origin (expanding window)', objective: 'MAE' },
    isCoreCandidate: true,
  },
  Ridge_Delta_Rolling_SEAS5: {
    id: 'Ridge_Delta_Rolling_SEAS5',
    name: 'Ridge Residual (Rolling Refit + SEAS5)',
    family: 'Linear Regularized',
    description: 'Ridge Residual (Rolling Refit) plus ECMWF SEAS5 seasonal forecasts of rainfall and 2m temperature (lead 1–3, z-scored on 2003–2017) as extra inputs. Historical diagnostic only; Persistence remains the reference model.',
    targetFormulation: 'Shrunk Residual [WSI(t) + w * r_hat(t,h)]',
    inputFeatures: ['6 stress components (t-11:t)', 'Calendar month (sin/cos)', 'SEAS5 precip + t2m z-scores, leads 1–3 (issued t+1)'],
    hyperparameters: { alpha: RESIDUAL_CONFIG.Ridge_delta_seas5.alpha ?? 'n/a', shrink_w: RESIDUAL_CONFIG.Ridge_delta_seas5.shrink_w, refit: 'every origin (expanding window)', objective: 'MAE' },
    isCoreCandidate: false,
  },
};

export const MODEL_LIST = Object.values(MODEL_REGISTRY);

/**
 * Authoritative Out-of-Sample Test Evaluation Metrics (2021–2024 Test Split on data_model_v2).
 * Scored on identical 368 test windows (1,104 prediction points across 8 districts).
 * All metrics independently verified from raw predictions in repo/results/baselines_v2/ and test_predictions_v2.csv.
 */
export const MODEL_EVALUATION_SUMMARIES: Record<ModelId, ModelEvaluationSummary> = {
  Persistence: {
    modelId: 'Persistence',
    overallMae: 0.4221,
    overallRmse: 0.5556,
    overallR2: -0.2845,
    overallSkillMae: 0.000,
    split: 'test',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3373, rmse: 0.4534, bias: -0.0026, r2: 0.1545, n: 368, skillMaeVsPersistence: 0.000 },
      2: { horizon: 2, mae: 0.4387, rmse: 0.5689, bias: 0.0081, r2: -0.3499, n: 368, skillMaeVsPersistence: 0.000 },
      3: { horizon: 3, mae: 0.4903, rmse: 0.6299, bias: 0.0180, r2: -0.6688, n: 368, skillMaeVsPersistence: 0.000 },
    },
  },
  WSI_Autoregression: {
    modelId: 'WSI_Autoregression',
    overallMae: 0.5011,
    overallRmse: 0.6440,
    overallR2: -0.7261,
    overallSkillMae: -0.1871,
    split: 'test',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3582, rmse: 0.4804, bias: 0.2194, r2: 0.0510, n: 368, skillMaeVsPersistence: -0.0619 },
      2: { horizon: 2, mae: 0.5070, rmse: 0.6478, bias: 0.4071, r2: -0.7503, n: 368, skillMaeVsPersistence: -0.1557 },
      3: { horizon: 3, mae: 0.6381, rmse: 0.7707, bias: 0.5700, r2: -1.4980, n: 368, skillMaeVsPersistence: -0.3015 },
    },
  },
  Residual_LSTM_ExpB: {
    modelId: 'Residual_LSTM_ExpB',
    overallMae: 0.5079,
    overallRmse: 0.6710,
    overallR2: -0.8736,
    overallSkillMae: -0.2033,
    split: 'test',
    isTestAvailable: true,
    statusNote: 'Reproduced retraining on data_model_v2 (seed 42, epoch 3). Evaluated on 368 test windows.',
    horizons: {
      1: { horizon: 1, mae: 0.3875, rmse: 0.5281, bias: 0.2676, r2: -0.1467, n: 368, skillMaeVsPersistence: -0.1488 },
      2: { horizon: 2, mae: 0.5116, rmse: 0.6769, bias: 0.4082, r2: -0.9113, n: 368, skillMaeVsPersistence: -0.1662 },
      3: { horizon: 3, mae: 0.6246, rmse: 0.7834, bias: 0.5371, r2: -1.5807, n: 368, skillMaeVsPersistence: -0.2740 },
    },
  },
  Ridge_Regression: {
    modelId: 'Ridge_Regression',
    overallMae: 0.5443,
    overallRmse: 0.7430,
    overallR2: -1.2974,
    overallSkillMae: -0.2896,
    split: 'test',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3770, rmse: 0.5328, bias: 0.2788, r2: -0.1672, n: 368, skillMaeVsPersistence: -0.1176 },
      2: { horizon: 2, mae: 0.5589, rmse: 0.7518, bias: 0.4744, r2: -1.3574, n: 368, skillMaeVsPersistence: -0.2739 },
      3: { horizon: 3, mae: 0.6972, rmse: 0.8984, bias: 0.6203, r2: -2.3948, n: 368, skillMaeVsPersistence: -0.4220 },
    },
  },
  XGBoost: {
    modelId: 'XGBoost',
    overallMae: 0.5511,
    overallRmse: 0.7043,
    overallR2: -1.0640,
    overallSkillMae: -0.3056,
    split: 'test',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.4116, rmse: 0.5415, bias: 0.2779, r2: -0.2058, n: 368, skillMaeVsPersistence: -0.2203 },
      2: { horizon: 2, mae: 0.5616, rmse: 0.7154, bias: 0.4756, r2: -1.1347, n: 368, skillMaeVsPersistence: -0.2802 },
      3: { horizon: 3, mae: 0.6800, rmse: 0.8264, bias: 0.6175, r2: -1.8723, n: 368, skillMaeVsPersistence: -0.3871 },
    },
  },
  Seasonal_Persistence: {
    modelId: 'Seasonal_Persistence',
    overallMae: 0.5755,
    overallRmse: 0.7245,
    overallR2: -1.1841,
    overallSkillMae: -0.3634,
    split: 'test',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.5685, rmse: 0.7184, bias: -0.0338, r2: -1.1221, n: 368, skillMaeVsPersistence: -0.6854 },
      2: { horizon: 2, mae: 0.5755, rmse: 0.7247, bias: -0.0047, r2: -1.1908, n: 368, skillMaeVsPersistence: -0.3118 },
      3: { horizon: 3, mae: 0.5825, rmse: 0.7302, bias: 0.0139, r2: -1.2426, n: 368, skillMaeVsPersistence: -0.1882 },
    },
  },
  LSTM: {
    modelId: 'LSTM',
    overallMae: null,
    overallRmse: null,
    overallR2: null,
    overallSkillMae: null,
    split: 'test',
    isTestAvailable: false,
    statusNote: 'Unavailable on v2 (evaluated only on legacy v1: N=360, MAE 0.5583)',
    horizons: {
      1: { horizon: 1, mae: null, rmse: null, bias: null, r2: null, n: 0, skillMaeVsPersistence: null },
      2: { horizon: 2, mae: null, rmse: null, bias: null, r2: null, n: 0, skillMaeVsPersistence: null },
      3: { horizon: 3, mae: null, rmse: null, bias: null, r2: null, n: 0, skillMaeVsPersistence: null },
    },
  },
  AR_Persistence_Ensemble: {
    modelId: 'AR_Persistence_Ensemble',
    overallMae: 0.4596,
    overallRmse: 0.6017,
    overallR2: -0.5068,
    overallSkillMae: -0.0888,
    split: 'test',
    isTestAvailable: true,
    statusNote: 'Historical diagnostic evaluation on 368 windows (2021–2024). Blended using validation-frozen weights.',
    horizons: {
      1: { horizon: 1, mae: 0.3582, rmse: 0.4804, bias: 0.2194, r2: 0.0510, n: 368, skillMaeVsPersistence: -0.0619 },
      2: { horizon: 2, mae: 0.4575, rmse: 0.6016, bias: 0.3124, r2: -0.5096, n: 368, skillMaeVsPersistence: -0.0428 },
      3: { horizon: 3, mae: 0.5631, rmse: 0.7025, bias: 0.4559, r2: -1.0757, n: 368, skillMaeVsPersistence: -0.1484 },
    },
  },
  Ridge_Delta_Rolling: residualSummary('Ridge_Delta_Rolling', 'Ridge_delta_rolling', 'test', 'Expanding-window refit at each of 46 test origins; repo/results/residual_ml_fix/.'),
  Ridge_Delta_Rolling_SEAS5: residualSummary('Ridge_Delta_Rolling_SEAS5', 'Ridge_delta_seas5_rolling', 'test', 'Historical diagnostic (2021–2024). +5.8% vs Persistence, p = 0.26: not statistically significant.'),
};

/**
 * Authoritative Validation Split Evaluation Metrics (2018–2020 Validation Split on data_model_v2).
 * Scored on identical 272 validation windows (816 prediction points across 8 districts).
 * On this validation split, WSI Autoregression and Residual LSTM beat Persistence.
 */
export const MODEL_VALIDATION_SUMMARIES: Record<ModelId, ModelEvaluationSummary> = {
  WSI_Autoregression: {
    modelId: 'WSI_Autoregression',
    overallMae: 0.4702,
    overallRmse: 0.6416,
    overallR2: 0.5404,
    overallSkillMae: 0.0868, // +8.68% over Persistence
    split: 'validation',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3475, rmse: 0.4592, bias: 0.0445, r2: 0.7571, n: 272, skillMaeVsPersistence: 0.0986 },
      2: { horizon: 2, mae: 0.4813, rmse: 0.6553, bias: 0.0972, r2: 0.5218, n: 272, skillMaeVsPersistence: 0.0896 },
      3: { horizon: 3, mae: 0.5819, rmse: 0.7711, bias: 0.1269, r2: 0.3527, n: 272, skillMaeVsPersistence: 0.0771 },
    },
  },
  Residual_LSTM_ExpB: {
    modelId: 'Residual_LSTM_ExpB',
    overallMae: 0.4888,
    overallRmse: 0.6575,
    overallR2: 0.5173,
    overallSkillMae: 0.0507, // +5.07% over Persistence (0.5149)
    split: 'validation',
    isTestAvailable: true,
    statusNote: 'Reproduced retraining on data_model_v2 (seed 42, epoch 3). Evaluated on 272 validation windows.',
    horizons: {
      1: { horizon: 1, mae: 0.3638, rmse: 0.4711, bias: 0.0854, r2: 0.7444, n: 272, skillMaeVsPersistence: 0.0565 },
      2: { horizon: 2, mae: 0.5029, rmse: 0.6585, bias: 0.0975, r2: 0.5172, n: 272, skillMaeVsPersistence: 0.0488 },
      3: { horizon: 3, mae: 0.5996, rmse: 0.8009, bias: 0.1698, r2: 0.3019, n: 272, skillMaeVsPersistence: 0.0490 },
    },
  },
  Persistence: {
    modelId: 'Persistence',
    overallMae: 0.5149,
    overallRmse: 0.7124,
    overallR2: 0.4333,
    overallSkillMae: 0.000,
    split: 'validation',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3856, rmse: 0.4892, bias: 0.0299, r2: 0.7244, n: 272, skillMaeVsPersistence: 0.000 },
      2: { horizon: 2, mae: 0.5287, rmse: 0.7197, bias: 0.0723, r2: 0.4232, n: 272, skillMaeVsPersistence: 0.000 },
      3: { horizon: 3, mae: 0.6305, rmse: 0.8749, bias: 0.0931, r2: 0.1669, n: 272, skillMaeVsPersistence: 0.000 },
    },
  },
  Ridge_Regression: {
    modelId: 'Ridge_Regression',
    overallMae: 0.5372,
    overallRmse: 0.7191,
    overallR2: 0.4226,
    overallSkillMae: -0.0432,
    split: 'validation',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3850, rmse: 0.5035, bias: 0.0528, r2: 0.7080, n: 272, skillMaeVsPersistence: 0.0014 },
      2: { horizon: 2, mae: 0.5478, rmse: 0.7320, bias: 0.0904, r2: 0.4033, n: 272, skillMaeVsPersistence: -0.0363 },
      3: { horizon: 3, mae: 0.6786, rmse: 0.8730, bias: 0.1174, r2: 0.1705, n: 272, skillMaeVsPersistence: -0.0763 },
    },
  },
  XGBoost: {
    modelId: 'XGBoost',
    overallMae: 0.5442,
    overallRmse: 0.6926,
    overallR2: 0.4644,
    overallSkillMae: -0.0568,
    split: 'validation',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 0.3925, rmse: 0.4966, bias: 0.0783, r2: 0.7159, n: 272, skillMaeVsPersistence: -0.0179 },
      2: { horizon: 2, mae: 0.5636, rmse: 0.7086, bias: 0.1316, r2: 0.4408, n: 272, skillMaeVsPersistence: -0.0662 },
      3: { horizon: 3, mae: 0.6764, rmse: 0.8309, bias: 0.1544, r2: 0.2486, n: 272, skillMaeVsPersistence: -0.0728 },
    },
  },
  Seasonal_Persistence: {
    modelId: 'Seasonal_Persistence',
    overallMae: 1.1942,
    overallRmse: 1.4474,
    overallR2: -1.3388,
    overallSkillMae: -1.3193,
    split: 'validation',
    isTestAvailable: true,
    horizons: {
      1: { horizon: 1, mae: 1.2024, rmse: 1.4510, bias: 0.2517, r2: -1.4247, n: 272, skillMaeVsPersistence: -2.1187 },
      2: { horizon: 2, mae: 1.1901, rmse: 1.4456, bias: 0.2726, r2: -1.3273, n: 272, skillMaeVsPersistence: -1.2512 },
      3: { horizon: 3, mae: 1.1902, rmse: 1.4455, bias: 0.2813, r2: -1.2742, n: 272, skillMaeVsPersistence: -0.8876 },
    },
  },
  LSTM: {
    modelId: 'LSTM',
    overallMae: null,
    overallRmse: null,
    overallR2: null,
    overallSkillMae: null,
    split: 'validation',
    isTestAvailable: false,
    statusNote: 'Unavailable on v2 (evaluated only on legacy v1: N=288, Val MAE 0.5173)',
    horizons: {
      1: { horizon: 1, mae: null, rmse: null, bias: null, r2: null, n: 0, skillMaeVsPersistence: null },
      2: { horizon: 2, mae: null, rmse: null, bias: null, r2: null, n: 0, skillMaeVsPersistence: null },
      3: { horizon: 3, mae: null, rmse: null, bias: null, r2: null, n: 0, skillMaeVsPersistence: null },
    },
  },
  AR_Persistence_Ensemble: {
    modelId: 'AR_Persistence_Ensemble',
    overallMae: 0.4655,
    overallRmse: 0.6444,
    overallR2: 0.5364,
    overallSkillMae: 0.0960, // +9.60% over Persistence (0.5149), beats WSI-AR (0.4702)
    split: 'validation',
    isTestAvailable: true,
    statusNote: 'Optimal validation ensemble. Strictly improves over WSI-AR (0.4702) and Persistence (0.5149).',
    horizons: {
      1: { horizon: 1, mae: 0.3475, rmse: 0.4592, bias: 0.0445, r2: 0.7571, n: 272, skillMaeVsPersistence: 0.0986 },
      2: { horizon: 2, mae: 0.4771, rmse: 0.6585, bias: 0.0913, r2: 0.5171, n: 272, skillMaeVsPersistence: 0.0975 },
      3: { horizon: 3, mae: 0.5717, rmse: 0.7753, bias: 0.1199, r2: 0.3457, n: 272, skillMaeVsPersistence: 0.0932 },
    },
  },
  Ridge_Delta_Rolling: residualSummary('Ridge_Delta_Rolling', 'Ridge_delta_rolling', 'validation', 'Rolling refit over 34 validation origins. Optimistic: alpha and w were tuned on this split.'),
  Ridge_Delta_Rolling_SEAS5: residualSummary('Ridge_Delta_Rolling_SEAS5', 'Ridge_delta_seas5_rolling', 'validation', 'Rolling refit over 34 validation origins. Optimistic: alpha and w were tuned on this split.'),
};

/**
 * Validation-Trained Blending Specifications for AR-12 + Persistence Ensemble.
 * Weights learned strictly on pooled 2018–2020 chronological validation observations (N=272 per horizon).
 */
export const ENSEMBLE_WEIGHT_SPECS = {
  1: { horizon: 1, alphaAr: 1.000, alphaPers: 0.000, label: '100% WSI-AR / 0% Persistence' },
  2: { horizon: 2, alphaAr: 0.763, alphaPers: 0.237, label: '76.3% WSI-AR / 23.7% Persistence' },
  3: { horizon: 3, alphaAr: 0.793, alphaPers: 0.207, label: '79.3% WSI-AR / 20.7% Persistence' },
} as const;

/**
 * Authoritative District-level evaluation metrics from repo/results/baselines_v2/
 * Scored on the 2021–2024 test split on data_model_v2 (Persistence Forecaster, N=46 windows per district).
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
  beed: { mae: 0.4113, rmse: 0.5459, r2: -0.1102, maeH1: 0.3236, maeH2: 0.4318, maeH3: 0.4784, r2H1: 0.3330, r2H3: -0.4462, skillH1: 0.000, n: 46 },
  csn: { mae: 0.4870, rmse: 0.6259, r2: -0.4091, maeH1: 0.3791, maeH2: 0.4973, maeH3: 0.5845, r2H1: 0.0805, r2H3: -0.8259, skillH1: 0.000, n: 46 },
  dharashiv: { mae: 0.4035, rmse: 0.5364, r2: -0.1295, maeH1: 0.3179, maeH2: 0.4300, maeH3: 0.4626, r2H1: 0.3630, r2H3: -0.5063, skillH1: 0.000, n: 46 },
  hingoli: { mae: 0.4040, rmse: 0.5423, r2: -0.8201, maeH1: 0.3526, maeH2: 0.4042, maeH3: 0.4552, r2H1: -0.5581, r2H3: -1.1348, skillH1: 0.000, n: 46 },
  jalna: { mae: 0.4644, rmse: 0.6071, r2: -0.2456, maeH1: 0.3408, maeH2: 0.4980, maeH3: 0.5543, r2H1: 0.2564, r2H3: -0.6418, skillH1: 0.000, n: 46 },
  latur: { mae: 0.3533, rmse: 0.4553, r2: 0.0795, maeH1: 0.2957, maeH2: 0.3552, maeH3: 0.4091, r2H1: 0.4430, r2H3: -0.2404, skillH1: 0.000, n: 46 },
  nanded: { mae: 0.4001, rmse: 0.5222, r2: -0.4672, maeH1: 0.3142, maeH2: 0.4035, maeH3: 0.4827, r2H1: 0.0271, r2H3: -1.0762, skillH1: 0.000, n: 46 },
  parbhani: { mae: 0.4533, rmse: 0.5910, r2: -0.7327, maeH1: 0.3744, maeH2: 0.4897, maeH3: 0.4956, r2H1: -0.2184, r2H3: -1.1643, skillH1: 0.000, n: 46 },
};

/**
 * Historical Legacy v1 Benchmark Archive.
 * Preserved for audit trail and historical comparison.
 * Scored on data_model (v1) with N=360 test windows (1,080 horizon forecasts) and N=288 validation windows.
 */
export const LEGACY_V1_HISTORICAL_EVALUATIONS = {
  description: 'Historical v1 benchmark (2021–2024, N=360 forecast windows / 1,080 horizon observations)',
  dataset: 'data_model (v1)',
  testLeaderboard: {
    Persistence: { overallMae: 0.4188, overallRmse: 0.5540, overallR2: -0.2712, n: 360 },
    WSI_Autoregression: { overallMae: 0.5068, overallRmse: 0.6512, overallR2: -0.7550, n: 360 },
    Direct_LSTM_ExpA: {
      overallMae: 0.5583,
      overallRmse: 0.7260,
      overallR2: -1.1833,
      overallBias: 0.4596,
      skillMaeVsPersistence: -0.3330,
      h1Mae: 0.4258,
      h2Mae: 0.5650,
      h3Mae: 0.6841,
      n: 360,
    },
  },
  validationLeaderboard: {
    WSI_Autoregression: { overallMae: 0.4518, overallRmse: 0.6244, overallR2: 0.5404, skillMaeVsPersistence: 0.1313, n: 288 },
    Direct_LSTM_ExpA: { overallMae: 0.5173, overallRmse: 0.6850, overallR2: 0.4430, n: 288 },
    Persistence: { overallMae: 0.5201, overallRmse: 0.7230, overallR2: 0.4120, n: 288 },
  },
};

/**
 * Backward compatibility alias for district disaggregated evaluation (Persistence Benchmark).
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

