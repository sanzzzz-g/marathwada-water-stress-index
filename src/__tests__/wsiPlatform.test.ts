import { normalizeDistrictName, DISTRICT_LIST } from '../data/districts';
import {
  calculateWsi,
  getStressCategory,
  calculatePersistenceSkill,
  computeForecastFromResidual,
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

export interface TestSuiteResults {
  passed: number;
  failed: number;
  errors: string[];
  unitPassed: number;
  integrationPassed: number;
}

/**
 * Validates all core scientific invariants, GitHub URL builders, CSV schemas,
 * mocked response handlers, and genuine live network GitHub dataset retrieval.
 */
export async function runAllPlatformTests(): Promise<TestSuiteResults> {
  let passed = 0;
  let failed = 0;
  let unitPassed = 0;
  let integrationPassed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, isIntegration = false) {
    if (condition) {
      passed++;
      if (isIntegration) {
        integrationPassed++;
      } else {
        unitPassed++;
      }
    } else {
      failed++;
      errors.push(`Assertion Failed: ${testName}`);
    }
  }

  /* =========================================================================
   * PART A: OFFLINE SCIENTIFIC INVARIANTS & STATISTICAL METRICS (UNIT TESTS)
   * ========================================================================= */

  // 1. District Name Normalization & Aliases
  assert(normalizeDistrictName('Aurangabad') === 'csn', '[Unit] Normalizes Aurangabad -> csn');
  assert(normalizeDistrictName('Chhatrapati Sambhajinagar') === 'csn', '[Unit] Normalizes Chhatrapati Sambhajinagar -> csn');
  assert(normalizeDistrictName('Osmanabad') === 'dharashiv', '[Unit] Normalizes Osmanabad -> dharashiv');
  assert(normalizeDistrictName('Dharashiv') === 'dharashiv', '[Unit] Normalizes Dharashiv -> dharashiv');
  assert(normalizeDistrictName('Jalna') === 'jalna', '[Unit] Normalizes Jalna -> jalna');
  assert(normalizeDistrictName('Beed') === 'beed', '[Unit] Normalizes Beed -> beed');
  assert(normalizeDistrictName('Latur') === 'latur', '[Unit] Normalizes Latur -> latur');
  assert(normalizeDistrictName('Nanded') === 'nanded', '[Unit] Normalizes Nanded -> nanded');
  assert(normalizeDistrictName('Parbhani') === 'parbhani', '[Unit] Normalizes Parbhani -> parbhani');
  assert(normalizeDistrictName('Hingoli') === 'hingoli', '[Unit] Normalizes Hingoli -> hingoli');
  assert(normalizeDistrictName('InvalidName123') === null, '[Unit] Returns null for unknown district');
  assert(DISTRICT_LIST.length === 8, '[Unit] Exact 8 Marathwada districts registered');

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
  assert(Math.abs(computedW0 - expectedW0) < 1e-6, '[Unit] W0 computes exact equal-weight average');

  // 3. W1 Structural Formulation
  const expectedW1 =
    0.25 * mockComponents.spiStressZ +
    (1 / 12) * mockComponents.soilStressZ +
    (1 / 12) * mockComponents.ndviStressZ +
    (1 / 12) * mockComponents.lstStressZ +
    0.25 * mockComponents.groundwaterStressZ +
    0.25 * mockComponents.surfaceWaterStressZ;
  const computedW1 = calculateWsi(mockComponents, 'W1_experimental');
  assert(Math.abs(computedW1 - expectedW1) < 1e-6, '[Unit] W1 computes domain-balanced index');

  // 4. Stress Category Thresholds (repo/src/wsi.py)
  assert(getStressCategory(-1.8) === 'Very Wet', '[Unit] WSI -1.8 is Very Wet');
  assert(getStressCategory(-1.0) === 'Wet', '[Unit] WSI -1.0 is Wet');
  assert(getStressCategory(0.2) === 'Normal', '[Unit] WSI 0.2 is Normal');
  assert(getStressCategory(THRESHOLD_MODERATE) === 'Moderate Stress', '[Unit] WSI 0.5 is Moderate Stress');
  assert(getStressCategory(1.49) === 'Moderate Stress', '[Unit] WSI 1.49 is Moderate Stress');
  assert(getStressCategory(THRESHOLD_SEVERE) === 'Severe Stress', '[Unit] WSI 1.5 is Severe Stress');

  // 5. Residual Forecast Formulation
  const currentWsi = 1.2;
  const predResidual = 0.25;
  assert(computeForecastFromResidual(currentWsi, predResidual) === 1.45, '[Unit] Residual forecast addition correct');
  assert(computeForecastFromResidual(currentWsi, -1.8) === -0.6, '[Unit] Forecast permits negative WSI anomaly on replenishing delta');

  // 6. Persistence-Relative Skill
  assert(Math.abs(calculatePersistenceSkill(0.156, 0.222) - 0.2973) < 1e-3, '[Unit] Calculates positive Skill_MAE');
  assert(calculatePersistenceSkill(0.222, 0.222) === 0.0, '[Unit] Skill_MAE is 0.0 when equal to persistence');
  assert(calculatePersistenceSkill(0.300, 0.200) === -0.5, '[Unit] Calculates negative Skill_MAE when worse than persistence');

  // 7. Temporal Evaluation Split Boundaries
  assert(classifyEvaluationSplit('2004-01') === 'TRAIN', '[Unit] 2004-01 is TRAIN target');
  assert(classifyEvaluationSplit('2017-12') === 'TRAIN', '[Unit] 2017-12 is TRAIN target');
  assert(classifyEvaluationSplit('2018-01') === 'VAL', '[Unit] 2018-01 is VAL target');
  assert(classifyEvaluationSplit('2020-12') === 'VAL', '[Unit] 2020-12 is VAL target');
  assert(classifyEvaluationSplit('2021-01') === 'TEST', '[Unit] 2021-01 is TEST target');
  assert(classifyEvaluationSplit('2024-12') === 'TEST', '[Unit] 2024-12 is TEST target');

  // 8. Boundary Origin Exclusion Check
  assert(isBoundaryOriginExcluded('2017-10') === true, '[Unit] Excludes 2017-10 origin crossing Train/Val boundary');
  assert(isBoundaryOriginExcluded('2017-11') === true, '[Unit] Excludes 2017-11 origin crossing Train/Val boundary');
  assert(isBoundaryOriginExcluded('2020-10') === true, '[Unit] Excludes 2020-10 origin crossing Val/Test boundary');
  assert(isBoundaryOriginExcluded('2020-11') === true, '[Unit] Excludes 2020-11 origin crossing Val/Test boundary');
  assert(isBoundaryOriginExcluded('2019-05') === false, '[Unit] Keeps regular interior origin 2019-05');

  // 9. Statistical Regression Metrics Calculator
  const actuals = [1.0, 1.5, 2.0, 0.5];
  const preds = [1.1, 1.4, 2.1, 0.6];
  const regMetrics = calculateRegressionMetrics(actuals, preds);
  assert(regMetrics.n === 4, '[Unit] Metric sample size n matches');
  assert(Math.abs(regMetrics.mae - 0.1) < 1e-4, '[Unit] MAE calculated accurately');

  // 10. Contingency Table
  const actualEvents = [true, true, false, false, true];
  const predEvents = [true, false, false, true, true];
  const contMetrics = calculateContingencyMetrics(actualEvents, predEvents);
  assert(contMetrics.hits === 2, '[Unit] Contingency hits count correct');
  assert(contMetrics.misses === 1, '[Unit] Contingency misses count correct');
  assert(contMetrics.falseAlarms === 1, '[Unit] Contingency false alarms count correct');
  assert(contMetrics.correctNegatives === 1, '[Unit] Contingency correct negatives count correct');

  /* =========================================================================
   * PART B: OFFLINE URL BUILDER, RESOLUTION & SCHEMA VALIDATION (UNIT TESTS)
   * ========================================================================= */

  // 11. GitHub Raw URL Builder & Path Resolution Tests
  const rootUrl = buildRawGitHubUrl('data.csv', 'main', 'sanzzzz-g', 'marathwada-drought-wsi');
  assert(
    rootUrl === 'https://raw.githubusercontent.com/sanzzzz-g/marathwada-drought-wsi/main/data.csv',
    '[Unit] Root file URL correctly formatted'
  );

  const subfolderUrl = buildRawGitHubUrl('outputs/Marathwada_MODEL_DATASET_2003_2024.csv', 'main');
  assert(
    subfolderUrl === 'https://raw.githubusercontent.com/sanzzzz-g/marathwada-drought-wsi/main/outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    '[Unit] Subdirectory file URL correctly encoded and formatted'
  );

  const encodedUrl = buildRawGitHubUrl('outputs/nested path/file name.csv', 'feature/test');
  assert(
    encodedUrl === 'https://raw.githubusercontent.com/sanzzzz-g/marathwada-drought-wsi/feature%2Ftest/outputs/nested%20path/file%20name.csv',
    '[Unit] Spaces and slashes in ref/path are safely URL-encoded'
  );

  assert(
    resolveDatasetPath('final_model') === 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    '[Unit] resolveDatasetPath maps final_model ID to verified outputs path'
  );
  assert(
    resolveDatasetPath('Marathwada_MODEL_DATASET_2003_2024.csv') === 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    '[Unit] resolveDatasetPath maps bare filename to verified outputs path'
  );
  assert(
    resolveDatasetPath('final_audit') === 'outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv',
    '[Unit] resolveDatasetPath maps final_audit ID to verified audit outputs path'
  );

  // 12. CSV Schema Validator: Pipeline Column Mapping & Negative Z-Scores
  const pipelineCsv = `district,date,year,month,split,spi_stress_z,soil_stress_z,ndvi_stress_z,lst_stress_z,groundwater_stress_z,surface_water_stress_z,wsi,wsi_category
Beed,2003-01-01,2003,1,train,0.5963,0.5779,0.8724,0.7652,-0.3186,0.7490,0.5404,Moderate Stress
Jalna,2003-01-01,2003,1,train,-1.2000,-0.8000,-0.9000,-0.5000,-1.4000,-1.0000,-0.9667,Wet
Beed,2003-01-01,2003,1,train,0.5963,0.5779,0.8724,0.7652,-0.3186,0.7490,0.5404,Moderate Stress`; // duplicate

  const report = validateAndParseCsv(pipelineCsv);
  assert(report.isValid === true, '[Unit] CSV validation passed for pipeline format');
  assert(report.validRows === 2, '[Unit] Pipeline CSV deduplicated (2 unique observations)');
  assert(report.warnings.length > 0, '[Unit] Warning logged for duplicate observation');

  const beedRecord = report.parsedRecords.find(r => r.districtId === 'beed');
  assert(beedRecord !== undefined, '[Unit] Parsed Beed record exists');
  assert(
    Math.abs((beedRecord?.components.groundwaterStressZ ?? 0) - -0.3186) < 1e-3,
    '[Unit] Negative standardized groundwater z-score (-0.3186) is preserved and not clamped to 0'
  );
  assert(beedRecord?.split === 'train', '[Unit] Parsed split tag matches train');

  // 13. Invalid CSV Handling (Missing required columns)
  const invalidCsv = `foo,bar,baz\n1,2,3`;
  const invalidReport = validateAndParseCsv(invalidCsv);
  assert(invalidReport.isValid === false, '[Unit] Invalid CSV lacking date/district is rejected');
  assert(invalidReport.errors.length > 0, '[Unit] Validation errors reported for missing required columns');

  /* =========================================================================
   * PART C: OFFLINE MOCKED RESPONSE TESTS (HTML RESPONSES & NETWORK ERRORS)
   * ========================================================================= */

  const originalFetch = globalThis.fetch;
  try {
    // 14. Mocked HTML error response (e.g. 200 OK returning HTML document)
    globalThis.fetch = async () =>
      new Response('<!DOCTYPE html><html><body>Error 404 Not Found</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    const htmlFetch = await fetchCsvFromGitHub('outputs/fake.csv', 'main');
    assert(htmlFetch.success === false, '[Mocked] HTML response detected and rejected');
    assert(htmlFetch.status === 'remote_error', '[Mocked] HTML response flagged as remote_error');
    assert(htmlFetch.error?.includes('HTML') === true, '[Mocked] HTML rejection message produced');
    assert(htmlFetch.source === 'embedded_fallback', '[Mocked] HTML failure retains embedded_fallback source');

    // 15. Mocked network failure (e.g. fetch throws TypeError / network failure)
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch (DNS / CORS failure)');
    };
    const netFetch = await fetchCsvFromGitHub('outputs/fake.csv', 'main');
    assert(netFetch.success === false, '[Mocked] Network failure caught cleanly');
    assert(netFetch.status === 'network_error', '[Mocked] Network error status recorded');
    assert(netFetch.error?.includes('Network error') === true, '[Mocked] Network error message returned');
    assert(netFetch.source === 'embedded_fallback', '[Mocked] Network failure retains embedded_fallback source');
  } finally {
    globalThis.fetch = originalFetch;
  }

  /* =========================================================================
   * PART D: GENUINE NETWORK INTEGRATION TESTS (LIVE raw.githubusercontent.com)
   * ========================================================================= */

  // 16. Live Network Integration: HTTP 404 on nonexistent file
  const nonexistentFetch = await fetchCsvFromGitHub('Marathwada_FINAL_MODEL_DATASET_2003_2024.csv', 'main');
  assert(nonexistentFetch.success === false, '[Integration] Nonexistent root CSV fetch returns success: false', true);
  assert(nonexistentFetch.httpStatus === 404, '[Integration] Nonexistent root CSV fetch returns HTTP 404', true);
  assert(
    nonexistentFetch.error?.includes('404') === true,
    '[Integration] 404 error message is clearly reported',
    true
  );
  assert(
    nonexistentFetch.source === 'embedded_fallback',
    '[Integration] Failed fetch explicitly retains embedded_fallback source',
    true
  );

  // 17. Live Network Integration: HTTP 200 on verified model dataset
  const validModelFetch = await fetchCsvFromGitHub('outputs/Marathwada_MODEL_DATASET_2003_2024.csv', 'main');
  assert(validModelFetch.success === true, '[Integration] Verified model dataset fetch returns success: true', true);
  assert(validModelFetch.httpStatus === 200, '[Integration] Verified model dataset fetch returns HTTP 200', true);
  assert(validModelFetch.report?.isValid === true, '[Integration] Verified model dataset passes strict CSV schema validation', true);
  assert(validModelFetch.report?.validRows === 2112, '[Integration] Verified model dataset loads exactly 2,112 rows', true);
  assert(validModelFetch.manifest?.districtCount === 8, '[Integration] Verified model dataset detects 8 districts', true);
  assert(validModelFetch.report?.dateRange.min === '2003-01', '[Integration] Verified model dataset min date is 2003-01', true);
  assert(validModelFetch.report?.dateRange.max === '2024-12', '[Integration] Verified model dataset max date is 2024-12', true);
  assert(validModelFetch.source === 'remote_github', '[Integration] Successful fetch sets source to remote_github', true);

  // 18. Live Network Integration: HTTP 200 on verified master audit dataset
  const validAuditFetch = await fetchCsvFromGitHub('outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv', 'main');
  assert(validAuditFetch.success === true, '[Integration] Verified master audit dataset fetch returns success: true', true);
  assert(validAuditFetch.httpStatus === 200, '[Integration] Verified master audit dataset fetch returns HTTP 200', true);
  assert(validAuditFetch.report?.isValid === true, '[Integration] Verified master audit dataset passes strict CSV schema validation', true);
  assert(validAuditFetch.report?.validRows === 2112, '[Integration] Verified master audit dataset loads exactly 2,112 rows', true);
  assert(validAuditFetch.manifest?.districtCount === 8, '[Integration] Verified master audit dataset detects 8 districts', true);
  assert(validAuditFetch.report?.dateRange.min === '2003-01', '[Integration] Verified master audit dataset min date is 2003-01', true);
  assert(validAuditFetch.report?.dateRange.max === '2024-12', '[Integration] Verified master audit dataset max date is 2024-12', true);
  assert(validAuditFetch.source === 'remote_github', '[Integration] Master audit fetch sets source to remote_github', true);

  return { passed, failed, errors, unitPassed, integrationPassed };
}
