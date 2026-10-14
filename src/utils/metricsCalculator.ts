export interface RegressionMetrics {
  mae: number;
  rmse: number;
  bias: number; // mean(y_pred - y_true)
  r2: number;
  n: number;
}

export interface ContingencyMetrics {
  hits: number; // WSI predicted severe, actual scarcity occurred
  misses: number; // Scarcity occurred, WSI did not flag
  falseAlarms: number; // WSI flagged severe, no official scarcity reported
  correctNegatives: number;
  totalEvents: number;
  probabilityOfDetection: number; // POD = hits / (hits + misses)
  falseAlarmRatio: number; // FAR = falseAlarms / (hits + falseAlarms)
  criticalSuccessIndex: number; // CSI = hits / (hits + misses + falseAlarms)
}

/**
 * Calculates standard statistical metrics from actual vs predicted arrays
 */
export function calculateRegressionMetrics(actuals: number[], predictions: number[]): RegressionMetrics {
  if (actuals.length === 0 || actuals.length !== predictions.length) {
    return { mae: 0, rmse: 0, bias: 0, r2: 0, n: 0 };
  }

  const n = actuals.length;
  let sumAbsError = 0;
  let sumSqError = 0;
  let sumError = 0;
  let sumActual = 0;

  for (let i = 0; i < n; i++) {
    const error = predictions[i] - actuals[i];
    sumAbsError += Math.abs(error);
    sumSqError += error * error;
    sumError += error;
    sumActual += actuals[i];
  }

  const mae = sumAbsError / n;
  const rmse = Math.sqrt(sumSqError / n);
  const bias = sumError / n;
  const meanActual = sumActual / n;

  let totalSumSquares = 0;
  for (let i = 0; i < n; i++) {
    const diff = actuals[i] - meanActual;
    totalSumSquares += diff * diff;
  }

  // R² = 1 - (SS_res / SS_tot)
  const r2 = totalSumSquares > 0 ? 1 - sumSqError / totalSumSquares : 0;

  return {
    mae: Math.round(mae * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    bias: Math.round(bias * 1000) / 1000,
    r2: Math.round(r2 * 1000) / 1000,
    n,
  };
}

/**
 * Contingency table analysis for independent scarcity / disaster alerts
 */
export function calculateContingencyMetrics(
  actualEvents: boolean[],
  predictedEvents: boolean[]
): ContingencyMetrics {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let correctNegatives = 0;

  for (let i = 0; i < actualEvents.length; i++) {
    const actual = actualEvents[i];
    const pred = predictedEvents[i];

    if (actual && pred) hits++;
    else if (actual && !pred) misses++;
    else if (!actual && pred) falseAlarms++;
    else correctNegatives++;
  }

  const totalEvents = hits + misses;
  const pod = totalEvents > 0 ? hits / totalEvents : 0;
  const far = hits + falseAlarms > 0 ? falseAlarms / (hits + falseAlarms) : 0;
  const csi = hits + misses + falseAlarms > 0 ? hits / (hits + misses + falseAlarms) : 0;

  return {
    hits,
    misses,
    falseAlarms,
    correctNegatives,
    totalEvents,
    probabilityOfDetection: Math.round(pod * 1000) / 1000,
    falseAlarmRatio: Math.round(far * 1000) / 1000,
    criticalSuccessIndex: Math.round(csi * 1000) / 1000,
  };
}

/**
 * Validates temporal split boundaries
 * Training: Jan 2004 - Dec 2017
 * Validation: Jan 2018 - Dec 2020
 * Test: Jan 2021 - Dec 2024
 * Returns 'TRAIN' | 'VAL' | 'TEST' | 'BOUNDARY_EXCLUDED'
 */
export function classifyEvaluationSplit(targetDate: string): 'TRAIN' | 'VAL' | 'TEST' | 'OUT_OF_BOUNDS' {
  const [yearStr, monthStr] = targetDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (year >= 2004 && year <= 2017) return 'TRAIN';
  if (year >= 2018 && year <= 2020) return 'VAL';
  if (year >= 2021 && year <= 2024) return 'TEST';
  return 'OUT_OF_BOUNDS';
}

/**
 * Checks if a forecast origin should be excluded because its 3-month target window crosses split boundary
 * Exclude origins: 2017-10, 2017-11 (target reaches into 2018 Val split)
 * Exclude origins: 2020-10, 2020-11 (target reaches into 2021 Test split)
 */
export function isBoundaryOriginExcluded(originDate: string): boolean {
  return (
    originDate === '2017-10' ||
    originDate === '2017-11' ||
    originDate === '2020-10' ||
    originDate === '2020-11'
  );
}
