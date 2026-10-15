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
import {
  buildRawGitHubUrl,
  resolveDatasetPath,
  fetchCsvFromGitHub,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
  DEFAULT_BRANCH,
} from '../services/githubFetcher';

/**
 * Validates all core scientific invariants, GitHub URL builders, CSV schemas,
 * and remote GitHub dataset retrieval behavior.
 */
export async function runAllPlatformTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  // 2. W0 Baseline Formulation (Equal Weighting 1/6)
  const mockComponents = {
    spiStressZ: 1.2,
    soilStressZ: 0.6,
    ndviStressZ: 0.9,
    lstStressZ: 1.5,
    groundwaterStressZ: 0.3,
    surfaceWaterStressZ: 0.9,
    rainfallStress: 1.2,
    soilMoistureStress: 0.6,
    ndviStress: 0.9,
    lstStress: 1.5,
    groundwaterStress: 0.3,
    surfaceWaterStress: 0.9,
  };
  const sumScores = 1.2 + 0.6 + 0.9 + 1.5 + 0.3 + 0.9; // 5.4
  const expectedW0 = sumScores / 6; // 0.90
  const computedW0 = calculateWsi(mockComponents, 'W0');
  assert(Math.abs(computedW0 - expectedW0) < 1e-6, 'W0 computes exact equal-weight average');

  // 3. W1 Structural Formulation
  const expectedW1 =
    0.25 * mockComponents.spiStressZ +
    (1 / 12) * mockComponents.soilStressZ +
    (1 / 12) * mockComponents.ndviStressZ +
    (1 / 12) * mockComponents.lstStressZ +
    0.25 * mockComponents.groundwaterStressZ +
    0.25 * mockComponents.surfaceWaterStressZ;
  const computedW1 = calculateWsi(mockComponents, 'W1_experimental');
  assert(Math.abs(computedW1 - expectedW1) < 1e-6, 'W1 computes domain-balanced index');

  // 4. Stress Category Thresholds (repo/src/wsi.py)
  assert(getStressCategory(-1.8) === 'Very Wet', 'WSI -1.8 is Very Wet');
  assert(getStressCategory(-1.0) === 'Wet', 'WSI -1.0 is Wet');
  assert(getStressCategory(0.2) === 'Normal', 'WSI 0.2 is Normal');
  assert(getStressCategory(THRESHOLD_MODERATE) === 'Moderate Stress', 'WSI 0.5 is Moderate Stress');
  assert(getStressCategory(1.49) === 'Moderate Stress', 'WSI 1.49 is Moderate Stress');
  assert(getStressCategory(THRESHOLD_SEVERE) === 'Severe Stress', 'WSI 1.5 is Severe Stress');

  // 5. Residual Forecast Formulation
  const currentWsi = 1.2;
  const predResidual = 0.25;
  assert(computeForecastFromResidual(currentWsi, predResidual) === 1.45, 'Residual forecast addition correct');
  assert(computeForecastFromResidual(currentWsi, -1.8) === -0.6, 'Forecast permits negative WSI anomaly on replenishing delta');

  // 6. Persistence-Relative Skill
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

  // 8. Boundary Origin Exclusion Check
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

  // 11. GitHub Raw URL Builder & Path Resolution Tests
  const rootUrl = buildRawGitHubUrl('data.csv', 'main', 'sanzzzz-g', 'marathwada-drought-wsi');
  assert(
    rootUrl === 'https://raw.githubusercontent.com/sanzzzz-g/marathwada-drought-wsi/main/data.csv',
    'Root file URL correctly formatted'
  );

  const subfolderUrl = buildRawGitHubUrl('outputs/Marathwada_MODEL_DATASET_2003_2024.csv', 'main');
  assert(
    subfolderUrl === 'https://raw.githubusercontent.com/sanzzzz-g/marathwada-drought-wsi/main/outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    'Subdirectory file URL correctly encoded and formatted'
  );

  assert(
    resolveDatasetPath('final_model') === 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    'resolveDatasetPath maps final_model ID to verified outputs path'
  );
  assert(
    resolveDatasetPath('Marathwada_MODEL_DATASET_2003_2024.csv') === 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    'resolveDatasetPath maps bare filename to verified outputs path'
  );
  assert(
    resolveDatasetPath('final_audit') === 'outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv',
    'resolveDatasetPath maps final_audit ID to verified audit outputs path'
  );

  // 12. CSV Schema Validator: Pipeline Column Mapping & Negative Z-Scores
  const pipelineCsv = `district,date,year,month,split,spi_stress_z,soil_stress_z,ndvi_stress_z,lst_stress_z,groundwater_stress_z,surface_water_stress_z,wsi,wsi_category
Beed,2003-01-01,2003,1,train,0.5963,0.5779,0.8724,0.7652,-0.3186,0.7490,0.5404,Moderate Stress
Jalna,2003-01-01,2003,1,train,-1.2000,-0.8000,-0.9000,-0.5000,-1.4000,-1.0000,-0.9667,Wet
Beed,2003-01-01,2003,1,train,0.5963,0.5779,0.8724,0.7652,-0.3186,0.7490,0.5404,Moderate Stress`; // duplicate

  const report = validateAndParseCsv(pipelineCsv);
  assert(report.isValid === true, 'CSV validation passed for pipeline format');
  assert(report.validRows === 2, 'Pipeline CSV deduplicated (2 unique observations)');
  assert(report.warnings.length > 0, 'Warning logged for duplicate observation');

  const beedRecord = report.parsedRecords.find(r => r.districtId === 'beed');
  assert(beedRecord !== undefined, 'Parsed Beed record exists');
  assert(
    Math.abs((beedRecord?.components.groundwaterStressZ ?? 0) - -0.3186) < 1e-3,
    'Negative standardized groundwater z-score (-0.3186) is preserved and not clamped to 0'
  );
  assert(beedRecord?.split === 'train', 'Parsed split tag matches train');

  // 13. Invalid CSV Handling (Missing required columns)
  const invalidCsv = `foo,bar,baz\n1,2,3`;
  const invalidReport = validateAndParseCsv(invalidCsv);
  assert(invalidReport.isValid === false, 'Invalid CSV lacking date/district is rejected');
  assert(invalidReport.errors.length > 0, 'Validation errors reported for missing required columns');

  // 14. Remote GitHub CSV Fetcher: HTTP 404 on nonexistent file
  const nonexistentFetch = await fetchCsvFromGitHub('Marathwada_FINAL_MODEL_DATASET_2003_2024.csv', 'main');
  assert(nonexistentFetch.success === false, 'Nonexistent root CSV fetch returns success: false');
  assert(nonexistentFetch.httpStatus === 404, 'Nonexistent root CSV fetch returns HTTP 404');
  assert(
    nonexistentFetch.error?.includes('404') === true,
    '404 error message is clearly reported'
  );
  assert(
    nonexistentFetch.source === 'embedded_fallback',
    'Failed fetch explicitly retains embedded_fallback source'
  );

  // 15. Remote GitHub CSV Fetcher: HTTP 200 on verified model dataset
  const validModelFetch = await fetchCsvFromGitHub('outputs/Marathwada_MODEL_DATASET_2003_2024.csv', 'main');
  assert(validModelFetch.success === true, 'Verified model dataset fetch returns success: true');
  assert(validModelFetch.httpStatus === 200, 'Verified model dataset fetch returns HTTP 200');
  assert(validModelFetch.report?.validRows === 2112, 'Verified model dataset loads all 2,112 rows');
  assert(validModelFetch.manifest?.districtCount === 8, 'Verified model dataset detects 8 districts');
  assert(validModelFetch.source === 'remote_github', 'Successful fetch sets source to remote_github');

  // 16. Remote GitHub CSV Fetcher: HTTP 200 on verified master audit dataset
  const validAuditFetch = await fetchCsvFromGitHub('outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv', 'main');
  assert(validAuditFetch.success === true, 'Verified master audit dataset fetch returns success: true');
  assert(validAuditFetch.httpStatus === 200, 'Verified master audit dataset fetch returns HTTP 200');
  assert(validAuditFetch.report?.validRows === 2112, 'Verified master audit dataset loads all 2,112 rows');

  return { passed, failed, errors };
}
