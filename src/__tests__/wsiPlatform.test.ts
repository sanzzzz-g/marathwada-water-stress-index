import { normalizeDistrictName, DISTRICT_LIST } from '../data/districts';
import {
  calculateWsi,
  getStressCategory,
  calculatePersistenceSkill,
  computeForecastFromResidual,
  W0_WEIGHTS,
  W1_WEIGHTS,
  THRESHOLD_MODERATE,
  THRESHOLD_SEVERE,
} from '../utils/wsiCalculations';
import {
  calculateRegressionMetrics,
  calculateContingencyMetrics,
  classifyEvaluationSplit,
  isBoundaryOriginExcluded,
} from '../utils/metricsCalculator';
import { validateAndParseCsv } from '../utils/csvValidator';

/**
 * Lightweight test runner validating all core scientific invariants without heavy external test dependencies.
 */
export function runAllPlatformTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion Failed: ${testName}`);
    }
  }

  // 1. District Name Normalization & Aliases
  assert(normalizeDistrictName('Aurangabad') === 'csn', 'Normalizes Aurangabad -> csn');
  assert(normalizeDistrictName('Chhatrapati Sambhajinagar') === 'csn', 'Normalizes Chhatrapati Sambhajinagar -> csn');
  assert(normalizeDistrictName('Osmanabad') === 'dharashiv', 'Normalizes Osmanabad -> dharashiv');
  assert(normalizeDistrictName('Dharashiv') === 'dharashiv', 'Normalizes Dharashiv -> dharashiv');
  assert(normalizeDistrictName('Jalna') === 'jalna', 'Normalizes Jalna -> jalna');
  assert(normalizeDistrictName('Beed') === 'beed', 'Normalizes Beed -> beed');
  assert(normalizeDistrictName('Latur') === 'latur', 'Normalizes Latur -> latur');
  assert(normalizeDistrictName('Nanded') === 'nanded', 'Normalizes Nanded -> nanded');
  assert(normalizeDistrictName('Parbhani') === 'parbhani', 'Normalizes Parbhani -> parbhani');
  assert(normalizeDistrictName('Hingoli') === 'hingoli', 'Normalizes Hingoli -> hingoli');
  assert(normalizeDistrictName('InvalidName123') === null, 'Returns null for unknown district');
  assert(DISTRICT_LIST.length === 8, 'Exact 8 Marathwada districts registered');

  // 2. W0 and W1 Weight Sum Invariants
  const w0Sum = Object.values(W0_WEIGHTS).reduce((a, b) => a + b, 0);
  assert(Math.abs(w0Sum - 1.0) < 1e-6, 'W0 weights sum exactly to 1.0');

  const w1Sum = Object.values(W1_WEIGHTS).reduce((a, b) => a + b, 0);
  assert(Math.abs(w1Sum - 1.0) < 1e-6, 'W1 weights sum exactly to 1.0');

  // 3. WSI Index Calculation
  // 3. WSI Index Calculation
  const testComponents = {
    spiStressZ: 1.0,
    soilStressZ: 1.0,
    ndviStressZ: 1.0,
    lstStressZ: 1.0,
    groundwaterStressZ: 1.0,
    surfaceWaterStressZ: 1.0,
  };
  assert(calculateWsi(testComponents, 'W0') === 1.0, 'W0 with unit components produces exactly 1.0');
  assert(calculateWsi(testComponents, 'W1_experimental') === 1.0, 'W1 with unit components produces exactly 1.0');

  // 4. Stress Category Thresholds (repo/src/wsi.py)
  assert(getStressCategory(-1.8) === 'Very Wet', 'WSI -1.8 is Very Wet');
  assert(getStressCategory(-1.0) === 'Wet', 'WSI -1.0 is Wet');
  assert(getStressCategory(0.2) === 'Normal', 'WSI 0.2 is Normal');
  assert(getStressCategory(0.5) === 'Moderate Stress', 'WSI 0.5 is Moderate Stress');
  assert(getStressCategory(1.49) === 'Moderate Stress', 'WSI 1.49 is Moderate Stress');
  assert(getStressCategory(1.50) === 'Severe Stress', 'WSI 1.50 is Severe Stress');
  assert(getStressCategory(2.4) === 'Severe Stress', 'WSI 2.4 is Severe Stress');

  // 5. Residual Forecast Formulation
  // residual(h) = WSI(t+h) - WSI(t) => forecast(h) = WSI(t) + predicted_residual(h)
  const currentWsi = 1.2;
  const predResidual = 0.25;
  assert(computeForecastFromResidual(currentWsi, predResidual) === 1.45, 'Residual forecast addition correct');
  assert(computeForecastFromResidual(currentWsi, -1.8) === -0.6, 'Forecast permits negative WSI anomaly on replenishing delta');

  // 6. Persistence-Relative Skill
  // Skill_MAE = 1 - MAE_model / MAE_persistence
  assert(Math.abs(calculatePersistenceSkill(0.156, 0.222) - 0.2973) < 1e-3, 'Calculates positive Skill_MAE');
  assert(calculatePersistenceSkill(0.222, 0.222) === 0.0, 'Skill_MAE is 0.0 when equal to persistence');
  assert(calculatePersistenceSkill(0.300, 0.200) === -0.5, 'Calculates negative Skill_MAE when worse than persistence');

  // 7. Temporal Evaluation Split Boundaries
  assert(classifyEvaluationSplit('2004-01') === 'TRAIN', '2004-01 is TRAIN target');
  assert(classifyEvaluationSplit('2017-12') === 'TRAIN', '2017-12 is TRAIN target');
  assert(classifyEvaluationSplit('2018-01') === 'VAL', '2018-01 is VAL target');
  assert(classifyEvaluationSplit('2020-12') === 'VAL', '2020-12 is VAL target');
  assert(classifyEvaluationSplit('2021-01') === 'TEST', '2021-01 is TEST target');
  assert(classifyEvaluationSplit('2024-12') === 'TEST', '2024-12 is TEST target');

  // 8. Boundary Origin Exclusion Check (Master prompt Section 16)
  assert(isBoundaryOriginExcluded('2017-10') === true, 'Excludes 2017-10 origin crossing Train/Val boundary');
  assert(isBoundaryOriginExcluded('2017-11') === true, 'Excludes 2017-11 origin crossing Train/Val boundary');
  assert(isBoundaryOriginExcluded('2020-10') === true, 'Excludes 2020-10 origin crossing Val/Test boundary');
  assert(isBoundaryOriginExcluded('2020-11') === true, 'Excludes 2020-11 origin crossing Val/Test boundary');
  assert(isBoundaryOriginExcluded('2019-05') === false, 'Keeps regular interior origin 2019-05');

  // 9. Statistical Regression Metrics Calculator
  const actuals = [1.0, 1.5, 2.0, 0.5];
  const preds = [1.1, 1.4, 2.1, 0.6];
  const regMetrics = calculateRegressionMetrics(actuals, preds);
  assert(regMetrics.n === 4, 'Metric sample size n matches');
  assert(Math.abs(regMetrics.mae - 0.1) < 1e-4, 'MAE calculated accurately');

  // 10. Contingency Table (Independent Scarcity Metrics)
  const actualEvents = [true, true, false, false, true];
  const predEvents = [true, false, false, true, true];
  const contMetrics = calculateContingencyMetrics(actualEvents, predEvents);
  assert(contMetrics.hits === 2, 'Contingency hits count correct');
  assert(contMetrics.misses === 1, 'Contingency misses count correct');
  assert(contMetrics.falseAlarms === 1, 'Contingency false alarms count correct');
  assert(contMetrics.correctNegatives === 1, 'Contingency correct negatives count correct');

  // 11. CSV Schema Validator & Duplicate Detection
  const validCsv = `date,district,rainfall_stress,soil_moisture_stress,ndvi_stress,lst_stress,groundwater_stress,surface_water_stress
2024-01,Beed,1.2,0.8,0.9,1.1,1.4,1.3
2024-01,Jalna,1.0,0.7,0.8,0.9,1.2,1.1
2024-01,Beed,1.2,0.8,0.9,1.1,1.4,1.3`; // duplicate row for Beed

  const report = validateAndParseCsv(validCsv);
  assert(report.isValid === true, 'CSV validation passed for standard format');
  assert(report.validRows === 2, 'Duplicate row deduplicated successfully');
  assert(report.warnings.length > 0, 'Warning logged for duplicate row');

  return { passed, failed, errors };
}
