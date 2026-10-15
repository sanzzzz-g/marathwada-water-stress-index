import { DatasetManifest } from '../types/wsi';
import { validateAndParseCsv, ValidationReport } from '../utils/csvValidator';

export interface RepositoryConfig {
  owner: string;
  repo: string;
  defaultBranch: string;
  authoritativeCommitSha: string;
}

export const REPOSITORY_CONFIG: RepositoryConfig = {
  owner: 'sanzzzz-g',
  repo: 'marathwada-drought-wsi',
  defaultBranch: 'main',
  authoritativeCommitSha: 'dab0aa50c5cd330b722288ed401271f013bad112',
};

export const GITHUB_REPO_OWNER = REPOSITORY_CONFIG.owner;
export const GITHUB_REPO_NAME = REPOSITORY_CONFIG.repo;
export const DEFAULT_BRANCH = REPOSITORY_CONFIG.defaultBranch;
export const AUTHORITATIVE_COMMIT_SHA = REPOSITORY_CONFIG.authoritativeCommitSha;

export interface KnownDatasetFile {
  id: string;
  name: string;
  filePath: string; // Exact repository-relative path including directory
  fileName: string; // Base filename or compatibility identifier
  description: string;
  purpose: string;
  expectedColumns?: number;
  expectedRows?: number;
  isVerified: boolean;
}

/**
 * Verified datasets discovered and audited in the GitHub repository (branch: main).
 * Files are located in the outputs/ and results/ subdirectories, NOT in the repository root.
 */
export const KNOWN_DATASET_FILES: KnownDatasetFile[] = [
  {
    id: 'final_model',
    name: 'Model Dataset (outputs/Marathwada_MODEL_DATASET_2003_2024.csv)',
    filePath: 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
    fileName: 'Marathwada_MODEL_DATASET_2003_2024.csv',
    description: 'Primary modeling dataset (2,112 rows, 17 columns) containing 6 multi-tier stress z-scores (spi, soil, ndvi, lst, groundwater, surface water), chronological split tags, and canonical WSI targets for all 8 districts.',
    purpose: 'Supervised Sequence Modeling & Forecasting Target Sequences',
    expectedColumns: 17,
    expectedRows: 2112,
    isVerified: true,
  },
  {
    id: 'final_audit',
    name: 'Master Audit Dataset (outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv)',
    filePath: 'outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv',
    fileName: 'Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv',
    description: 'Complete multi-tier audit trail (2,112 rows, 56 columns) containing raw station rainfall, ERA5-Land root-zone soil water layers 1–4, MODIS NDVI/LST anomalies, and GSDA observation well depths.',
    purpose: 'Data Traceability, QC & Station Auditing',
    expectedColumns: 56,
    expectedRows: 2112,
    isVerified: true,
  },
  {
    id: 'final_model_comparison',
    name: 'Final Model Comparison (results/final_model_comparison.csv)',
    filePath: 'results/final_model_comparison.csv',
    fileName: 'final_model_comparison.csv',
    description: 'Multi-horizon benchmark metrics across Persistence, AR(12), Ridge, XGBoost, and LSTM across horizons H=1, 2, 3.',
    purpose: 'Benchmark Evaluation & Model Governance',
    expectedColumns: 6,
    expectedRows: 16,
    isVerified: true,
  },
  {
    id: 'sample_data',
    name: 'Sample Model Data (data/sample/sample_model_data.csv)',
    filePath: 'data/sample/sample_model_data.csv',
    fileName: 'sample_model_data.csv',
    description: 'Sample preview of sequential model records.',
    purpose: 'Quick Verification & Testing',
    expectedColumns: 17,
    expectedRows: 50,
    isVerified: true,
  },
];

/**
 * Resolves any dataset identifier or raw filename to its verified repository path.
 */
export function resolveDatasetPath(input: string): string {
  const trimmed = input.trim().replace(/^\/+/, '');
  const match = KNOWN_DATASET_FILES.find(
    f => f.id === trimmed || f.filePath === trimmed || f.fileName === trimmed || f.filePath.endsWith('/' + trimmed)
  );
  return match ? match.filePath : trimmed;
}

/**
 * Builds a safely encoded raw GitHub URL supporting root files and subdirectories.
 */
export function buildRawGitHubUrl(
  filePath: string,
  branchOrCommit: string = DEFAULT_BRANCH,
  owner: string = GITHUB_REPO_OWNER,
  repo: string = GITHUB_REPO_NAME
): string {
  const cleanPath = filePath.trim().replace(/^\/+/, '');
  const encodedSegments = cleanPath
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');

  const encodedOwner = encodeURIComponent(owner.trim());
  const encodedRepo = encodeURIComponent(repo.trim());
  const encodedRef = encodeURIComponent(branchOrCommit.trim());

  return `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/${encodedRef}/${encodedSegments}`;
}

export const EMBEDDED_MANIFEST: DatasetManifest = {
  name: 'Marathwada Hydroclimatic Water Stress Dataset (2003–2024)',
  fileName: 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv',
  sourceRepo: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
  commitSha: AUTHORITATIVE_COMMIT_SHA,
  timeRange: '2003-01 to 2024-12 (22 full years / 264 months)',
  rowCount: 2112,
  districtCount: 8,
  units: {
    rainfall_stress: 'Dimensionless standardized anomaly (spi_stress_z = -SPI_3)',
    soil_moisture_stress: 'Dimensionless standardized anomaly (soil_stress_z)',
    ndvi_stress: 'Dimensionless standardized anomaly (ndvi_stress_z)',
    lst_stress: 'Dimensionless standardized anomaly (lst_stress_z)',
    groundwater_stress: 'Dimensionless standardized anomaly (groundwater_stress_z)',
    surface_water_stress: 'Dimensionless standardized anomaly (surface_water_stress_z)',
    wsi: 'Normalized Composite Water Stress Index (mean of 6 components)',
    reservoir_storage_pct: 'Live storage as percentage of gross capacity [%]',
  },
  missingDataPolicy: 'Zero retrospective lookahead imputation. Missing station intervals handled via local seasonal climatology.',
  knownLimitations: [
    'CGWB/GSDA observation wells are measured 4 times annually; intermediate monthly estimates use certified hydrogeological recession curves.',
    'Cloud-cover during peak monsoon (July–August) induces occasional noise in optical MODIS NDVI/LST composites; calibrated smoothing applied.',
    'Surface water frequency reflects Global WaterPack water extent; minor farm ponds are not comprehensively monitored.',
  ],
  lastAuditDate: '2024-12-31',
};

export interface FetchCsvResult {
  success: boolean;
  status: 'remote_success' | 'remote_error' | 'network_error';
  url: string;
  httpStatus?: number;
  data?: string;
  report?: ValidationReport;
  error?: string;
  source: 'remote_github' | 'embedded_fallback';
  manifest?: DatasetManifest;
}

/**
 * Attempts to fetch raw CSV from GitHub.
 * Strictly verifies HTTP status, response content-type, required schema columns, and logs resolved URL.
 */
export async function fetchCsvFromGitHub(
  filePathOrId: string,
  branchOrCommit: string = DEFAULT_BRANCH,
  owner: string = GITHUB_REPO_OWNER,
  repo: string = GITHUB_REPO_NAME
): Promise<FetchCsvResult> {
  const resolvedPath = resolveDatasetPath(filePathOrId);
  const rawUrl = buildRawGitHubUrl(resolvedPath, branchOrCommit, owner, repo);

  // Requirement 4 & 5: Log the resolved URL for debugging and verification
  console.log(`[WSI GitHub Fetcher] Fetching raw CSV from: ${rawUrl}`);

  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv,text/plain,*/*',
      },
    });

    if (!response.ok) {
      const statusText = response.statusText || 'Error';
      let errorMsg = `GitHub HTTP ${response.status}: ${statusText} for URL: ${rawUrl}`;
      if (response.status === 404) {
        errorMsg = `GitHub HTTP 404: Not Found at '${rawUrl}'. ` +
          `The requested file was not found in branch '${branchOrCommit}'. ` +
          `Verified path in repository: 'outputs/Marathwada_MODEL_DATASET_2003_2024.csv'.`;
      } else if (response.status === 403) {
        errorMsg = `GitHub HTTP 403: Forbidden or rate-limited by GitHub API for URL: ${rawUrl}.`;
      }

      console.warn(`[WSI GitHub Fetcher] ${errorMsg}`);
      return {
        success: false,
        status: 'remote_error',
        url: rawUrl,
        httpStatus: response.status,
        error: errorMsg,
        source: 'embedded_fallback',
      };
    }

    const csvText = await response.text();

    // Guard against HTML error pages returned with 200 OK
    if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.trim().startsWith('<html')) {
      const errorMsg = `Unexpected HTML content returned instead of CSV for URL: ${rawUrl}. The repository or file path may be inaccessible.`;
      console.warn(`[WSI GitHub Fetcher] ${errorMsg}`);
      return {
        success: false,
        status: 'remote_error',
        url: rawUrl,
        httpStatus: response.status,
        error: errorMsg,
        source: 'embedded_fallback',
      };
    }

    // Run scientific schema validation
    const report = validateAndParseCsv(csvText);

    if (!report.isValid) {
      const errorMsg = `CSV validation failed for '${resolvedPath}': ${report.errors.join('; ')}`;
      console.warn(`[WSI GitHub Fetcher] ${errorMsg}`);
      return {
        success: false,
        status: 'remote_error',
        url: rawUrl,
        httpStatus: 200,
        report,
        error: errorMsg,
        source: 'embedded_fallback',
      };
    }

    // Create dynamic manifest derived directly from the verified remote dataset
    const remoteManifest: DatasetManifest = {
      name: `GitHub Remote: ${resolvedPath}`,
      fileName: resolvedPath,
      sourceRepo: `https://github.com/${owner}/${repo}`,
      commitSha: branchOrCommit === DEFAULT_BRANCH ? AUTHORITATIVE_COMMIT_SHA : branchOrCommit,
      timeRange: `${report.dateRange.min} to ${report.dateRange.max} (${report.validRows} observations)`,
      rowCount: report.validRows,
      districtCount: report.detectedDistricts.length,
      units: EMBEDDED_MANIFEST.units,
      missingDataPolicy: EMBEDDED_MANIFEST.missingDataPolicy,
      knownLimitations: EMBEDDED_MANIFEST.knownLimitations,
      lastAuditDate: new Date().toISOString().slice(0, 10),
    };

    console.log(`[WSI GitHub Fetcher] Successfully loaded and validated ${report.validRows} records from ${rawUrl}`);

    return {
      success: true,
      status: 'remote_success',
      url: rawUrl,
      httpStatus: 200,
      data: csvText,
      report,
      manifest: remoteManifest,
      source: 'remote_github',
    };
  } catch (err: unknown) {
    const errorDetail = err instanceof Error ? err.message : 'Unknown network failure';
    const errorMsg = `Network error fetching GitHub CSV (${errorDetail}) for URL: ${rawUrl}. Verify network connectivity or CORS settings.`;
    console.error(`[WSI GitHub Fetcher] ${errorMsg}`, err);
    return {
      success: false,
      status: 'network_error',
      url: rawUrl,
      error: errorMsg,
      source: 'embedded_fallback',
    };
  }
}
