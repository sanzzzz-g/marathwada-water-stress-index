import { StressCategory, WeightingScheme, WsiComponents } from '../types/wsi';

/**
 * Authoritative WSI component weights from repo/src/wsi.py & pipeline.yaml:
 * Equal indicator weight: 1/6 (0.16666666666666666) per component.
 */
export const W0_WEIGHTS = {
  spiStressZ: 1 / 6,
  soilStressZ: 1 / 6,
  ndviStressZ: 1 / 6,
  lstStressZ: 1 / 6,
  groundwaterStressZ: 1 / 6,
  surfaceWaterStressZ: 1 / 6,
} as const;

/**
 * Experimental domain weighting variant (documented in notes):
 * Domain 1: Climate (SPI-3) = 0.25
 * Domain 2: Terrestrial Agro (Soil, NDVI, LST) = 0.25 (1/12 each = 0.083333)
 * Domain 3: Groundwater (GSDA) = 0.25
 * Domain 4: Surface Water (GWP) = 0.25
 */
export const W1_EXPERIMENTAL_WEIGHTS = {
  spiStressZ: 0.25,
  soilStressZ: 1 / 12,
  ndviStressZ: 1 / 12,
  lstStressZ: 1 / 12,
  groundwaterStressZ: 0.25,
  surfaceWaterStressZ: 0.25,
} as const;

export const W1_WEIGHTS = W1_EXPERIMENTAL_WEIGHTS;

export const THRESHOLD_VERY_WET = -1.5;
export const THRESHOLD_WET = -0.5;
export const THRESHOLD_MODERATE = 0.5;
export const THRESHOLD_SEVERE = 1.5;

/**
 * Computes Water Stress Index (WSI) from the 6 standardized stress components.
 * Matches repo/src/wsi.py line 60: out_df["wsi"] = out_df[components].mean(axis=1)
 */
export function calculateWsi(
  components: WsiComponents,
  scheme: WeightingScheme = 'W0'
): number {
  if (scheme === 'W1_experimental') {
    const rawWsi =
      components.spiStressZ * W1_EXPERIMENTAL_WEIGHTS.spiStressZ +
      components.soilStressZ * W1_EXPERIMENTAL_WEIGHTS.soilStressZ +
      components.ndviStressZ * W1_EXPERIMENTAL_WEIGHTS.ndviStressZ +
      components.lstStressZ * W1_EXPERIMENTAL_WEIGHTS.lstStressZ +
      components.groundwaterStressZ * W1_EXPERIMENTAL_WEIGHTS.groundwaterStressZ +
      components.surfaceWaterStressZ * W1_EXPERIMENTAL_WEIGHTS.surfaceWaterStressZ;
    return Math.round(rawWsi * 1000000) / 1000000;
  }

  // Authoritative W0 equal 1/6 mean
  const sum =
    components.spiStressZ +
    components.soilStressZ +
    components.ndviStressZ +
    components.lstStressZ +
    components.groundwaterStressZ +
    components.surfaceWaterStressZ;

  return Math.round((sum / 6.0) * 1000000) / 1000000;
}

/**
 * Classifies continuous WSI into drought categories.
 * Exact replication of repo/src/wsi.py classify_wsi():
 *   WSI < -1.5         : Very Wet
 *   -1.5 <= WSI < -0.5 : Wet
 *   -0.5 <= WSI < 0.5  : Normal
 *   0.5 <= WSI < 1.5   : Moderate Stress
 *   WSI >= 1.5         : Severe Stress
 */
export function getStressCategory(wsiVal: number): StressCategory {
  if (wsiVal < -1.5) {
    return 'Very Wet';
  } else if (wsiVal < -0.5) {
    return 'Wet';
  } else if (wsiVal < 0.5) {
    return 'Normal';
  } else if (wsiVal < 1.5) {
    return 'Moderate Stress';
  } else {
    return 'Severe Stress';
  }
}

/**
 * Color token mapping for all 5 verified stress categories
 */
export function getStressColor(category: StressCategory): {
  bg: string;
  text: string;
  border: string;
  hex: string;
} {
  switch (category) {
    case 'Severe Stress':
      return {
        bg: 'bg-rose-950/40',
        text: 'text-rose-400',
        border: 'border-rose-800/60',
        hex: '#f43f5e',
      };
    case 'Moderate Stress':
      return {
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-800/60',
        hex: '#f59e0b',
      };
    case 'Normal':
      return {
        bg: 'bg-teal-950/40',
        text: 'text-teal-400',
        border: 'border-teal-800/60',
        hex: '#14b8a6',
      };
    case 'Wet':
      return {
        bg: 'bg-cyan-950/40',
        text: 'text-cyan-400',
        border: 'border-cyan-800/60',
        hex: '#06b6d4',
      };
    case 'Very Wet':
      return {
        bg: 'bg-blue-950/40',
        text: 'text-blue-400',
        border: 'border-blue-800/60',
        hex: '#3b82f6',
      };
  }
}

/**
 * Continuous color mapping across standardized Z-score continuum (-2.5 to +2.5)
 */
export function getWsiContinuousColor(wsi: number): string {
  if (wsi >= 1.5) return '#e11d48'; // Severe Stress (Crimson)
  if (wsi >= 0.5) return '#f59e0b'; // Moderate Stress (Amber)
  if (wsi >= -0.5) return '#14b8a6'; // Normal (Teal)
  if (wsi >= -1.5) return '#06b6d4'; // Wet (Cyan)
  return '#3b82f6'; // Very Wet (Blue)
}

/**
 * Persistence-relative skill calculation:
 * Skill_MAE = 1 - MAE_model / MAE_persistence
 */
export function calculatePersistenceSkill(maeModel: number, maePersistence: number): number {
  if (maePersistence <= 0) return 0;
  const skill = 1.0 - (maeModel / maePersistence);
  return Math.round(skill * 10000) / 10000;
}

/**
 * Residual forecast reconstruction:
 * forecast(h) = WSI(t) + predicted_residual(h)
 */
export function computeForecastFromResidual(currentWsi: number, predictedResidual: number): number {
  return Math.round((currentWsi + predictedResidual) * 10000) / 10000;
}
