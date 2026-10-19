/**
 * Residual Ridge (rolling refit, with/without SEAS5) metrics loaded from the saved
 * artifacts of repo/src/residual_ml_fix.py. No values are retyped here except the
 * significance test, which the script does not persist.
 */
import testMetricsCsv from '../../repo/results/residual_ml_fix/test_metrics.csv?raw';
import detailJson from '../../repo/results/residual_ml_fix/rolling_detail_metrics.json?raw';
import configJson from '../../repo/results/residual_ml_fix/config.json?raw';
import { ForecastHorizon, ModelEvaluationSummary, ModelId } from '../types/wsi';

interface HorizonDetail { mae: number; rmse: number; bias: number; r2: number; n: number; skill: number }
interface SplitDetail { 1: HorizonDetail; 2: HorizonDetail; 3: HorizonDetail; overall: { mae: number; rmse: number; r2: number; skill: number } }

const detail: Record<string, { test: SplitDetail; validation: SplitDetail }> = JSON.parse(detailJson);
export const RESIDUAL_CONFIG: Record<string, { alpha: number | null; shrink_w: number }> = JSON.parse(configJson);

const csvRows: Record<string, Record<string, number>> = (() => {
  const [header, ...lines] = testMetricsCsv.trim().split(/\r?\n/);
  const cols = header.split(',');
  return Object.fromEntries(
    lines.map(line => {
      const cells = line.split(',');
      return [cells[0], Object.fromEntries(cols.slice(1).map((c, i) => [c, Number(cells[i + 1])]))];
    }),
  );
})();

export function residualSummary(modelId: ModelId, artifactKey: string, split: 'test' | 'validation', statusNote: string): ModelEvaluationSummary {
  const d = detail[artifactKey][split];
  const h = (k: ForecastHorizon) => ({
    horizon: k, mae: d[k].mae, rmse: d[k].rmse, bias: d[k].bias, r2: d[k].r2, n: d[k].n, skillMaeVsPersistence: d[k].skill,
  });
  return {
    modelId,
    overallMae: d.overall.mae,
    overallRmse: d.overall.rmse,
    overallR2: d.overall.r2,
    overallSkillMae: d.overall.skill,
    split,
    isTestAvailable: true,
    statusNote,
    horizons: { 1: h(1), 2: h(2), 3: h(3) },
  };
}

export interface ResidualComparisonRow { label: string; h1: number; h2: number; h3: number; overall: number; skill: number }

/** Persistence vs Ridge Rolling vs Ridge Rolling + SEAS5 on the 2021–2024 test windows. */
export const RESIDUAL_COMPARISON: ResidualComparisonRow[] = [
  ['Persistence (reference)', 'Persistence'],
  ['Ridge Residual (Rolling Refit)', 'Ridge_delta_rolling'],
  ['Ridge Residual (Rolling Refit + SEAS5)', 'Ridge_delta_seas5_rolling'],
].map(([label, key]) => {
  const r = csvRows[key];
  return { label, h1: r.mae_h1, h2: r.mae_h2, h3: r.mae_h3, overall: r.overall_mae, skill: r.skill_overall };
});

/** Paired t-test on per-origin mean MAE difference vs Persistence (46 test origins). Not saved by the script. */
export const SEAS5_SIGNIFICANCE = { pValue: 0.26, nOrigins: 46, significant: false };
