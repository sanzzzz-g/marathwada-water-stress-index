import { DatasetManifest } from '../types/wsi';
import { validateAndParseCsv, ValidationReport } from '../utils/csvValidator';

export const GITHUB_REPO_OWNER = 'sanzzzz-g';
export const GITHUB_REPO_NAME = 'marathwada-drought-wsi';
export const DEFAULT_BRANCH = 'main';

export const KNOWN_DATASET_FILES = [
  {
    id: 'final_model',
    name: 'Final Model Dataset (2003–2024)',
    fileName: 'Marathwada_FINAL_MODEL_DATASET_2003_2024.csv',
    description: 'Primary modeling dataset containing 12-month lag features, 6 components, and target horizons h=1,2,3 for all 8 districts.',
    purpose: 'Model Training & Validation Target Sequences',
  },
  {
    id: 'final_audit',
    name: 'Final Audit Dataset Corrected (2003–2024)',
    fileName: 'Marathwada_FINAL_AUDIT_DATASET_2003_2024_CORRECTED.csv',
    description: 'Traceable raw audit trail with ground-truth station observations, CGWB/GSDA water levels, and CWC reservoir tables.',
    purpose: 'Data Traceability & Quality Audit',
  },
];

export const EMBEDDED_MANIFEST: DatasetManifest = {
  name: 'Marathwada Hydroclimatic Water Stress Dataset (2003–2024)',
  fileName: 'Marathwada_FINAL_MODEL_DATASET_2003_2024.csv',
  sourceRepo: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
  commitSha: 'c8f49a2e6b1d98e7',
  timeRange: '2003-01 to 2024-12 (22 full years / 264 months)',
  rowCount: 2112,
  districtCount: 8,
  units: {
    rainfall_stress: 'Dimensionless normalized deficit [0–3]',
    soil_moisture_stress: 'Dimensionless normalized deficit [0–3]',
    ndvi_stress: 'Dimensionless inverted VCI [0–3]',
    lst_stress: 'Dimensionless normalized thermal anomaly [0–3]',
    groundwater_stress: 'Dimensionless normalized depth anomaly [0–3]',
    surface_water_stress: 'Dimensionless normalized storage deficit [0–3]',
    wsi: 'Normalized Hydroclimatic Water Stress Index [0–3]',
    reservoir_storage_pct: 'Live storage as percentage of gross capacity [%]',
  },
  missingDataPolicy: 'No retrospective lookahead imputation. Boundary months without station data flagged and handled via local seasonal climatology.',
  knownLimitations: [
    'CGWB/GSDA observation wells are measured 4 times annually; intermediate monthly water table estimates use certified hydrogeological recession curves.',
    'Cloud-cover during peak monsoon (July–August) induces occasional noise in optical MODIS NDVI/LST composites; calibrated smoothing applied.',
    'Reservoir percentages reflect major CWC/WRD projects; minor percolation tanks are not comprehensively monitored.',
  ],
  lastAuditDate: '2024-12-31',
};

/**
 * Attempts to fetch raw CSV from GitHub. If network is blocked or offline, returns structured error report.
 */
export async function fetchCsvFromGitHub(
  fileName: string,
  branchOrCommit: string = DEFAULT_BRANCH
): Promise<{ success: boolean; data?: string; report?: ValidationReport; error?: string }> {
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${branchOrCommit}/${fileName}`;

  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      headers: { Accept: 'text/csv,text/plain' },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub HTTP ${response.status}: ${response.statusText} for URL: ${rawUrl}`,
      };
    }

    const csvText = await response.text();
    const report = validateAndParseCsv(csvText);

    return {
      success: report.isValid,
      data: csvText,
      report,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network error';
    return {
      success: false,
      error: `Failed to fetch from GitHub (${errorMsg}). You can upload a local CSV file directly.`,
    };
  }
}
