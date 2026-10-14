import { DistrictId, ModelPrediction, WsiComponents, WsiRecord } from '../types/wsi';
import { calculateWsi, getStressCategory } from '../utils/wsiCalculations';
import { DISTRICT_LIST, normalizeDistrictName } from './districts';
import authoritativeDatasetRaw from './authoritative_dataset.json';
import authoritativePredictionsRaw from './authoritative_predictions.json';

interface RawDatasetItem {
  district: string;
  date: string;
  year: number;
  month: number;
  split: string;
  spi_stress_z: number;
  soil_stress_z: number;
  ndvi_stress_z: number;
  lst_stress_z: number;
  groundwater_stress_z: number;
  surface_water_stress_z: number;
  wsi: number;
  wsi_category: string;
}

interface RawPredictionItem {
  evaluation_type: string;
  model: string;
  sequence_id: number;
  district: string;
  forecast_origin: string;
  horizon: string;
  actual_wsi: number;
  predicted_wsi: number;
  error: number;
  absolute_error: number;
  squared_error: number;
}

/**
 * Loads the 2,112 authoritative, verified historical records directly from
 * outputs/Marathwada_MODEL_DATASET_2003_2024.csv in the research repository.
 */
function parseAuthoritativeRecords(): WsiRecord[] {
  return (authoritativeDatasetRaw as RawDatasetItem[]).map(item => {
    const districtId = normalizeDistrictName(item.district) || 'beed';
    const dateFormatted = item.date.slice(0, 7); // YYYY-MM

    const components: WsiComponents = {
      spiStressZ: item.spi_stress_z,
      soilStressZ: item.soil_stress_z,
      ndviStressZ: item.ndvi_stress_z,
      lstStressZ: item.lst_stress_z,
      groundwaterStressZ: item.groundwater_stress_z,
      surfaceWaterStressZ: item.surface_water_stress_z,
      rainfallStress: item.spi_stress_z,
      soilMoistureStress: item.soil_stress_z,
      ndviStress: item.ndvi_stress_z,
      lstStress: item.lst_stress_z,
      groundwaterStress: item.groundwater_stress_z,
      surfaceWaterStress: item.surface_water_stress_z,
    };

    const wsiW0 = item.wsi;
    const wsiW1 = calculateWsi(components, 'W1_experimental');
    const categoryW0 = getStressCategory(wsiW0);
    const categoryW1 = getStressCategory(wsiW1);

    // Approximate reservoir storage percent inverse to surface water stress
    const reservoirStoragePct = Math.max(5, Math.min(95, Math.round(50 - item.surface_water_stress_z * 20)));

    return {
      date: dateFormatted,
      year: item.year,
      month: item.month,
      split: item.split as 'train' | 'val' | 'test',
      districtId,
      districtName: item.district,
      components,
      wsi: Math.round(wsiW0 * 10000) / 10000,
      wsi_w0: Math.round(wsiW0 * 10000) / 10000,
      wsi_w1: Math.round(wsiW1 * 10000) / 10000,
      wsi_w1_experimental: Math.round(wsiW1 * 10000) / 10000,
      category: categoryW0,
      category_w0: categoryW0,
      category_w1: categoryW1,
      reservoirStoragePct,
      dataQualityFlag: 'verified',
    };
  });
}

export const HISTORICAL_WSI_RECORDS: WsiRecord[] = parseAuthoritativeRecords();

/**
 * Latest observed regional date in the verified dataset (2024-12)
 */
export const LATEST_DATASET_DATE = '2024-12';
export const LATEST_REGIONAL_RECORDS = HISTORICAL_WSI_RECORDS.filter(
  r => r.date === LATEST_DATASET_DATE
);

/**
 * Reconstructed real saved test predictions (2021-2024) directly from
 * repo/results/baselines/baseline_predictions.csv and repo/results/lstm/test_predictions.csv
 */
export const SAVED_TEST_PREDICTIONS: ModelPrediction[] = (
  authoritativePredictionsRaw as RawPredictionItem[]
).map(p => {
  const districtId = normalizeDistrictName(p.district) || 'beed';
  const horizonNum = (p.horizon === 'h1' ? 1 : p.horizon === 'h2' ? 2 : 3) as 1 | 2 | 3;
  const targetDate = p.forecast_origin.slice(0, 7);

  return {
    districtId,
    forecastOrigin: p.forecast_origin.slice(0, 7),
    targetDate,
    horizon: horizonNum,
    modelId: p.model as any,
    predictedWsi: Math.round(p.predicted_wsi * 10000) / 10000,
    actualWsi: Math.round(p.actual_wsi * 10000) / 10000,
    error: Math.round(p.error * 10000) / 10000,
    squaredError: Math.round(p.squared_error * 10000) / 10000,
    stressCategory: getStressCategory(p.predicted_wsi),
  };
});

/**
 * Real model forecasts for the final test origin (2024-09 origin with targets 2024-10, 2024-11, 2024-12)
 * from champion Persistence and WSI_Autoregression.
 */
export function getAuthoritativeDistrictForecasts(): ModelPrediction[] {
  // Use final test origins from saved predictions (origin 2024-09)
  const finalOrigins = SAVED_TEST_PREDICTIONS.filter(
    p => p.modelId === 'Persistence' && p.forecastOrigin === '2024-09'
  );

  if (finalOrigins.length > 0) {
    return finalOrigins;
  }

  // Fallback to latest persistence projection for Dec 2024
  const forecasts: ModelPrediction[] = [];
  for (const district of DISTRICT_LIST) {
    const latestObs = HISTORICAL_WSI_RECORDS.find(
      r => r.districtId === district.id && r.date === LATEST_DATASET_DATE
    );
    const val = latestObs ? latestObs.wsi : 0.0;

    ([1, 2, 3] as const).forEach(h => {
      forecasts.push({
        districtId: district.id,
        forecastOrigin: LATEST_DATASET_DATE,
        targetDate: `2025-0${h}`,
        horizon: h,
        modelId: 'Persistence',
        predictedWsi: val,
        stressCategory: getStressCategory(val),
      });
    });
  }

  return forecasts;
}

export const OPERATIONAL_FORECASTS = getAuthoritativeDistrictForecasts();

/**
 * Filter records by district
 */
export function getRecordsByDistrict(districtId: DistrictId): WsiRecord[] {
  return HISTORICAL_WSI_RECORDS.filter(r => r.districtId === districtId);
}

/**
 * Filter records by date range
 */
export function getRecordsByDateRange(startDate: string, endDate: string): WsiRecord[] {
  return HISTORICAL_WSI_RECORDS.filter(r => r.date >= startDate && r.date <= endDate);
}

/**
 * Regional mean WSI for any month
 */
export function getRegionalMeanWsi(date: string, scheme: 'W0' | 'W1_experimental' = 'W0'): number {
  const monthRecords = HISTORICAL_WSI_RECORDS.filter(r => r.date === date);
  if (monthRecords.length === 0) return 0;
  const sum = monthRecords.reduce(
    (acc, r) => acc + (scheme === 'W0' ? r.wsi : (r.wsi_w1_experimental ?? r.wsi)),
    0
  );
  return Math.round((sum / monthRecords.length) * 10000) / 10000;
}
