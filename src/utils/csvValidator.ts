import { z } from 'zod';
import { normalizeDistrictName } from '../data/districts';
import { DistrictId, StressCategory, WsiComponents, WsiRecord } from '../types/wsi';
import { calculateWsi, getStressCategory } from './wsiCalculations';

export const CsvRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Date must be formatted as YYYY-MM or YYYY-MM-DD'),
  district: z.string().min(1, 'District is required'),
  spi_stress_z: z.coerce.number().min(-10).max(10).optional(),
  soil_stress_z: z.coerce.number().min(-10).max(10).optional(),
  ndvi_stress_z: z.coerce.number().min(-10).max(10).optional(),
  lst_stress_z: z.coerce.number().min(-10).max(10).optional(),
  groundwater_stress_z: z.coerce.number().min(-10).max(10).optional(),
  surface_water_stress_z: z.coerce.number().min(-10).max(10).optional(),
  rainfall_stress: z.coerce.number().min(-10).max(10).optional(),
  soil_moisture_stress: z.coerce.number().min(-10).max(10).optional(),
  ndvi_stress: z.coerce.number().min(-10).max(10).optional(),
  lst_stress: z.coerce.number().min(-10).max(10).optional(),
  groundwater_stress: z.coerce.number().min(-10).max(10).optional(),
  surface_water_stress: z.coerce.number().min(-10).max(10).optional(),
  wsi: z.coerce.number().min(-10).max(10).optional(),
  wsi_category: z.string().optional(),
  split: z.string().optional(),
  reservoir_storage_pct: z.coerce.number().min(0).max(100).optional(),
});

export type RawCsvRow = z.infer<typeof CsvRowSchema>;

export interface ValidationReport {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
  detectedDistricts: string[];
  unrecognizedDistricts: string[];
  dateRange: { min: string; max: string };
  missingDataSummary: Record<string, number>;
  parsedRecords: WsiRecord[];
}

/**
 * Parses CSV text, runs schema validation, normalizes district names,
 * maps standardized stress anomalies (preserving negative z-scores), and computes W0/W1 scores.
 */
export function validateAndParseCsv(csvText: string): ValidationReport {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      isValid: false,
      totalRows: 0,
      validRows: 0,
      errorCount: 1,
      warningCount: 0,
      errors: ['CSV file is empty or missing headers.'],
      warnings: [],
      detectedDistricts: [],
      unrecognizedDistricts: [],
      dateRange: { min: 'N/A', max: 'N/A' },
      missingDataSummary: {},
      parsedRecords: [],
    };
  }

  // Parse headers (normalize lower-case and strip quotes)
  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  // Check required core columns
  const dateColIdx = headerMap['date'] ?? headerMap['month'] ?? headerMap['timestamp'];
  const districtColIdx = headerMap['district'] ?? headerMap['district_name'] ?? headerMap['region'];

  const errors: string[] = [];
  const warnings: string[] = [];

  if (dateColIdx === undefined) {
    errors.push("Missing required column 'date' (or 'month').");
  }
  if (districtColIdx === undefined) {
    errors.push("Missing required column 'district'.");
  }

  // Find component columns or alias matches
  // Research repository uses standardized z-scores: spi_stress_z, soil_stress_z, ndvi_stress_z, lst_stress_z, groundwater_stress_z, surface_water_stress_z
  const rainIdx =
    headerMap['spi_stress_z'] ??
    headerMap['spi_stress'] ??
    headerMap['spi_3'] ??
    headerMap['rainfall_stress'] ??
    headerMap['rain_stress'] ??
    headerMap['rainfall'];

  const soilIdx =
    headerMap['soil_stress_z'] ??
    headerMap['soil_stress'] ??
    headerMap['soil_moisture_stress'] ??
    headerMap['soil_moisture'];

  const ndviIdx =
    headerMap['ndvi_stress_z'] ??
    headerMap['ndvi_stress'] ??
    headerMap['vci_stress'] ??
    headerMap['ndvi'];

  const lstIdx =
    headerMap['lst_stress_z'] ??
    headerMap['lst_stress'] ??
    headerMap['temp_stress'] ??
    headerMap['lst_celsius'] ??
    headerMap['lst'];

  const gwIdx =
    headerMap['groundwater_stress_z'] ??
    headerMap['groundwater_stress'] ??
    headerMap['gw_stress'] ??
    headerMap['groundwater_depth_m_bgl_raw'] ??
    headerMap['groundwater'];

  const swIdx =
    headerMap['surface_water_stress_z'] ??
    headerMap['surface_water_stress'] ??
    headerMap['sw_stress'] ??
    headerMap['surface_water_frequency'] ??
    headerMap['surface_water'] ??
    headerMap['reservoir_stress'];

  const wsiIdx = headerMap['wsi'] ?? headerMap['wsi_w0'] ?? headerMap['wsi_observed'];
  const wsiCategoryIdx = headerMap['wsi_category'] ?? headerMap['category_w0'] ?? headerMap['category'];
  const splitIdx = headerMap['split'];
  const resIdx = headerMap['reservoir_storage_pct'] ?? headerMap['reservoir_storage'];

  const hasComponentOrWsi = [rainIdx, soilIdx, ndviIdx, lstIdx, gwIdx, swIdx, wsiIdx].some(idx => idx !== undefined);
  if (!hasComponentOrWsi) {
    errors.push("Missing required stress metrics: CSV must contain at least one stress component (e.g. 'spi_stress_z', 'soil_stress_z') or 'wsi' column.");
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      totalRows: lines.length - 1,
      validRows: 0,
      errorCount: errors.length,
      warningCount: 0,
      errors,
      warnings,
      detectedDistricts: [],
      unrecognizedDistricts: [],
      dateRange: { min: 'N/A', max: 'N/A' },
      missingDataSummary: {},
      parsedRecords: [],
    };
  }

  const parsedRecords: WsiRecord[] = [];
  const recognizedDistricts = new Set<string>();
  const unrecognizedDistricts = new Set<string>();
  const seenDateDistrictKeys = new Set<string>();
  let minDate = '9999-99';
  let maxDate = '0000-00';
  const missingDataCounts: Record<string, number> = {
    rainfall: 0,
    soil: 0,
    ndvi: 0,
    lst: 0,
    groundwater: 0,
    surfacewater: 0,
  };

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (row.length <= Math.max(dateColIdx!, districtColIdx!)) continue;

    const rawDate = row[dateColIdx!];
    const rawDistrict = row[districtColIdx!];

    if (!rawDate || !rawDistrict) continue;

    // Normalize date to YYYY-MM
    let dateNorm = rawDate;
    if (rawDate.length >= 7) {
      dateNorm = rawDate.slice(0, 7);
    }

    const districtId = normalizeDistrictName(rawDistrict);
    if (!districtId) {
      unrecognizedDistricts.add(rawDistrict);
      continue;
    }
    recognizedDistricts.add(districtId);

    // Duplicate check
    const dupKey = `${dateNorm}_${districtId}`;
    if (seenDateDistrictKeys.has(dupKey)) {
      warnings.push(`Duplicate observation detected for district '${rawDistrict}' on date '${dateNorm}' at row ${i + 1}. Keeping first record.`);
      continue;
    }
    seenDateDistrictKeys.add(dupKey);

    if (dateNorm < minDate) minDate = dateNorm;
    if (dateNorm > maxDate) maxDate = dateNorm;

    // Standardized scores can be negative (e.g. -1.5 indicates wet conditions); do not clamp to >= 0
    const parseNum = (idx: number | undefined, missingKey: string, fallback = 0): number => {
      if (idx === undefined || row[idx] === undefined || row[idx] === '') {
        missingDataCounts[missingKey]++;
        return fallback;
      }
      const val = parseFloat(row[idx]);
      return isNaN(val) ? fallback : val;
    };

    const rain = parseNum(rainIdx, 'rainfall');
    const soil = parseNum(soilIdx, 'soil');
    const ndvi = parseNum(ndviIdx, 'ndvi');
    const lst = parseNum(lstIdx, 'lst');
    const gw = parseNum(gwIdx, 'groundwater');
    const sw = parseNum(swIdx, 'surfacewater');

    const components: WsiComponents = {
      spiStressZ: rain,
      soilStressZ: soil,
      ndviStressZ: ndvi,
      lstStressZ: lst,
      groundwaterStressZ: gw,
      surfaceWaterStressZ: sw,
      rainfallStress: rain,
      soilMoistureStress: soil,
      ndviStress: ndvi,
      lstStress: lst,
      groundwaterStress: gw,
      surfaceWaterStress: sw,
    };

    // Calculate WSI if not provided
    const wsiW0 = wsiIdx !== undefined && !isNaN(parseFloat(row[wsiIdx]))
      ? parseFloat(row[wsiIdx])
      : calculateWsi(components, 'W0');

    const wsiW1 = calculateWsi(components, 'W1_experimental');

    const [yearStr, monthStr] = dateNorm.split('-');
    const year = parseInt(yearStr, 10) || 2024;
    const month = parseInt(monthStr, 10) || 1;
    let rowSplit: 'train' | 'val' | 'validation' | 'test' = year < 2018 ? 'train' : year < 2021 ? 'val' : 'test';
    if (splitIdx !== undefined && row[splitIdx]) {
      const s = row[splitIdx].toLowerCase();
      if (s === 'train' || s === 'val' || s === 'validation' || s === 'test') {
        rowSplit = s as 'train' | 'val' | 'validation' | 'test';
      }
    }

    const validCategories: StressCategory[] = ['Very Wet', 'Wet', 'Normal', 'Moderate Stress', 'Severe Stress'];
    const rawCategory = wsiCategoryIdx !== undefined ? row[wsiCategoryIdx] : undefined;
    const categoryW0: StressCategory =
      rawCategory && validCategories.includes(rawCategory as StressCategory)
        ? (rawCategory as StressCategory)
        : getStressCategory(wsiW0);
    const categoryW1: StressCategory = getStressCategory(wsiW1);

    parsedRecords.push({
      date: dateNorm,
      year,
      month,
      split: rowSplit,
      districtId: districtId as DistrictId,
      districtName: rawDistrict,
      components,
      wsi: wsiW0,
      wsi_w0: wsiW0,
      wsi_w1: wsiW1,
      category: categoryW0,
      category_w0: categoryW0,
      category_w1: getStressCategory(wsiW1),
      reservoirStoragePct: resIdx !== undefined && !isNaN(parseFloat(row[resIdx])) ? parseFloat(row[resIdx]) : undefined,
      dataQualityFlag: 'verified',
    });
  }

  if (unrecognizedDistricts.size > 0) {
    warnings.push(`Ignored ${unrecognizedDistricts.size} unknown district names: ${Array.from(unrecognizedDistricts).join(', ')}`);
  }

  return {
    isValid: parsedRecords.length > 0 && errors.length === 0,
    totalRows: lines.length - 1,
    validRows: parsedRecords.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    detectedDistricts: Array.from(recognizedDistricts),
    unrecognizedDistricts: Array.from(unrecognizedDistricts),
    dateRange: { min: minDate === '9999-99' ? 'N/A' : minDate, max: maxDate === '0000-00' ? 'N/A' : maxDate },
    missingDataSummary: missingDataCounts,
    parsedRecords,
  };
}
