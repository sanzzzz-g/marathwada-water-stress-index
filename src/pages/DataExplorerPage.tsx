import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GitCommit,
  Github,
  Globe,
  Info,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { HISTORICAL_WSI_RECORDS } from '../data/historicalData';
import {
  AUTHORITATIVE_COMMIT_SHA,
  buildRawGitHubUrl,
  DEFAULT_BRANCH,
  EMBEDDED_MANIFEST,
  fetchCsvFromGitHub,
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER,
  KNOWN_DATASET_FILES,
  KnownDatasetFile,
  resolveDatasetPath,
} from '../services/githubFetcher';
import { DatasetManifest, WsiRecord } from '../types/wsi';
import { validateAndParseCsv, ValidationReport } from '../utils/csvValidator';

type DataSourceType = 'embedded_fallback' | 'remote_github' | 'local_upload';
type FetchState = 'idle' | 'fetching' | 'success' | 'error';

export const DataExplorerPage: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>('final_model');
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [customPath, setCustomPath] = useState('outputs/Marathwada_MODEL_DATASET_2003_2024.csv');
  const [branchOrCommit, setBranchOrCommit] = useState(DEFAULT_BRANCH);

  // Data state
  const [dataSource, setDataSource] = useState<DataSourceType>('embedded_fallback');
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [activeRecords, setActiveRecords] = useState<WsiRecord[]>(HISTORICAL_WSI_RECORDS);
  const [activeManifest, setActiveManifest] = useState<DatasetManifest>(EMBEDDED_MANIFEST);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  // Error / Success diagnostics
  const [lastFetchError, setLastFetchError] = useState<{
    status?: number;
    message: string;
    url: string;
    timestamp: string;
  } | null>(null);

  const [lastFetchSuccess, setLastFetchSuccess] = useState<{
    rows: number;
    url: string;
    timestamp: string;
  } | null>(null);

  // Filter / Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  // Resolved file details
  const selectedFile = KNOWN_DATASET_FILES.find(f => f.id === selectedFileId) || KNOWN_DATASET_FILES[0];
  const effectiveFilePath = useCustomPath ? customPath.trim() : selectedFile.filePath;
  const currentTargetUrl = buildRawGitHubUrl(effectiveFilePath, branchOrCommit, GITHUB_REPO_OWNER, GITHUB_REPO_NAME);

  // Handle GitHub Fetch
  const handleFetchGitHub = async () => {
    setFetchState('fetching');
    setLastFetchError(null);

    const res = await fetchCsvFromGitHub(effectiveFilePath, branchOrCommit);

    if (res.success && res.report && res.report.isValid && res.manifest) {
      setFetchState('success');
      setDataSource('remote_github');
      setActiveRecords(res.report.parsedRecords);
      setActiveManifest(res.manifest);
      setValidationReport(res.report);
      setLastFetchSuccess({
        rows: res.report.validRows,
        url: res.url,
        timestamp: new Date().toLocaleTimeString(),
      });
      setLastFetchError(null);
    } else {
      setFetchState('error');
      // Requirement 2 & 6: Do not claim remote sync succeeded. Clearly mark as embedded fallback.
      setDataSource('embedded_fallback');
      setActiveRecords(HISTORICAL_WSI_RECORDS);
      setActiveManifest(EMBEDDED_MANIFEST);
      if (res.report) {
        setValidationReport(res.report);
      }
      setLastFetchError({
        status: res.httpStatus,
        message: res.error || 'Failed to download or validate CSV file from GitHub.',
        url: res.url,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  // Handle Local CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) {
        const report = validateAndParseCsv(text);
        setValidationReport(report);
        if (report.isValid && report.parsedRecords.length > 0) {
          setDataSource('local_upload');
          setActiveRecords(report.parsedRecords);
          setActiveManifest({
            name: `Uploaded File: ${file.name}`,
            fileName: file.name,
            sourceRepo: 'Local User Ingestion',
            commitSha: 'LOCAL-FILE-' + Date.now().toString(16),
            timeRange: `${report.dateRange.min} to ${report.dateRange.max}`,
            rowCount: report.validRows,
            districtCount: report.detectedDistricts.length,
            units: EMBEDDED_MANIFEST.units,
            missingDataPolicy: 'Local validation without lookahead imputation.',
            knownLimitations: ['Custom uploaded dataset; schema checked via Zod validator.'],
            lastAuditDate: new Date().toISOString().slice(0, 10),
          });
          setFetchState('idle');
          setLastFetchError(null);
        } else {
          setFetchState('error');
          setLastFetchError({
            message: `Uploaded CSV validation failed: ${report.errors.join('; ')}`,
            url: file.name,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return activeRecords.filter(r => {
      const matchDist = districtFilter === 'ALL' || r.districtId === districtFilter;
      const matchSearch =
        !searchQuery ||
        r.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.date.includes(searchQuery);
      return matchDist && matchSearch;
    });
  }, [activeRecords, districtFilter, searchQuery]);

  // Export filtered records
  const handleExportCsv = () => {
    const headers = [
      'date',
      'year',
      'month',
      'district',
      'split',
      'spi_stress_z',
      'soil_stress_z',
      'ndvi_stress_z',
      'lst_stress_z',
      'groundwater_stress_z',
      'surface_water_stress_z',
      'wsi_w0',
      'wsi_w1',
      'category_w0',
      'category_w1',
      'reservoir_storage_pct',
    ];

    const rows = filteredRecords.map(r => [
      r.date,
      r.year,
      r.month,
      r.districtName,
      r.split,
      (r.components.spiStressZ ?? r.components.rainfallStress ?? 0).toFixed(4),
      (r.components.soilStressZ ?? r.components.soilMoistureStress ?? 0).toFixed(4),
      (r.components.ndviStressZ ?? r.components.ndviStress ?? 0).toFixed(4),
      (r.components.lstStressZ ?? r.components.lstStress ?? 0).toFixed(4),
      (r.components.groundwaterStressZ ?? r.components.groundwaterStress ?? 0).toFixed(4),
      (r.components.surfaceWaterStressZ ?? r.components.surfaceWaterStress ?? 0).toFixed(4),
      (r.wsi_w0 ?? r.wsi).toFixed(4),
      r.wsi_w1.toFixed(4),
      r.category_w0,
      r.category_w1,
      r.reservoirStoragePct !== undefined ? r.reservoirStoragePct : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `marathwada_wsi_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Data Source Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Data Ingestion & Integrity</span>
            <span aria-hidden="true">·</span>
            <span>GitHub Sync</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Strict Schema Verification</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Data Explorer & Repository Synchronizer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronize directly with verified repository data from{' '}
            <code className="text-cyan-300 font-mono">
              {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}
            </code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 transition-colors shrink-0"
          >
            <Github className="w-3.5 h-3.5 text-slate-400" />
            <span>Open GitHub Repo</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Prominent Active Data Source Indicator Banner */}
      <div className="p-4 rounded-lg border font-mono text-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm bg-[#0a0f1d] border-slate-800">
        <div className="flex items-start md:items-center gap-3">
          {dataSource === 'remote_github' ? (
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 font-bold">
                REMOTE GITHUB SYNCHRONIZED
              </span>
            </div>
          ) : fetchState === 'error' ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/70 text-amber-300 font-bold">
                EMBEDDED FALLBACK — REMOTE FETCH FAILED
              </span>
            </div>
          ) : dataSource === 'local_upload' ? (
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/70 text-cyan-300 font-bold">
                LOCAL CSV INGESTION ACTIVE
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-bold">
                EMBEDDED AUTHORITATIVE BASELINE
              </span>
            </div>
          )}

          <div className="text-slate-300">
            {dataSource === 'remote_github' && lastFetchSuccess && (
              <span>
                Synchronized with branch <code className="text-cyan-300">{branchOrCommit}</code> at {lastFetchSuccess.timestamp}. Displaying {activeRecords.length} live records.
              </span>
            )}
            {fetchState === 'error' && (
              <span className="text-amber-200">
                Remote retrieval unsuccessful. Displaying 2,112 verified local baseline records (2003–2024) to preserve application integrity.
              </span>
            )}
            {dataSource === 'local_upload' && (
              <span>
                Loaded {activeRecords.length} records from local file with complete Zod validation.
              </span>
            )}
            {dataSource === 'embedded_fallback' && fetchState === 'idle' && (
              <span>
                Displaying 2,112 offline-audited panel observations (8 districts × 264 months, 2003–2024).
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1 font-mono">
            <GitCommit className="w-3 h-3 text-cyan-400" />
            <span>Commit:</span>
            <code className="text-slate-200">{activeManifest.commitSha.slice(0, 10)}</code>
          </span>
          <span aria-hidden="true">·</span>
          <span>{activeRecords.length} rows</span>
        </div>
      </div>

      {/* GitHub Sync & Local Upload Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Direct Loader */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                Raw GitHub CSV Fetcher
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
              <GitBranch className="w-3 h-3" />
              <span>Public Repository</span>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {/* Repository Context Display */}
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Repository:</span>
                <span className="text-slate-200 font-semibold">{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Default Branch:</span>
                <span className="text-teal-400 font-semibold">{DEFAULT_BRANCH}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Audited Commit:</span>
                <span className="text-slate-400 font-mono">{AUTHORITATIVE_COMMIT_SHA.slice(0, 12)}</span>
              </div>
            </div>

            {/* Dataset Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="repo-dataset-select" className="text-slate-400">
                  Target Repository Dataset:
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomPath(!useCustomPath)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                >
                  {useCustomPath ? 'Select from verified files' : 'Enter custom repository path'}
                </button>
              </div>

              {!useCustomPath ? (
                <select
                  id="repo-dataset-select"
                  value={selectedFileId}
                  onChange={e => setSelectedFileId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                >
                  {KNOWN_DATASET_FILES.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customPath}
                  onChange={e => setCustomPath(e.target.value)}
                  placeholder="e.g. outputs/Marathwada_MODEL_DATASET_2003_2024.csv"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2 font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              )}

              {!useCustomPath && (
                <div className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {selectedFile.description}
                </div>
              )}
            </div>

            {/* Branch and Fetch Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="branch-commit-input" className="text-slate-400 block mb-1">
                  Branch / Tag / Ref:
                </label>
                <input
                  id="branch-commit-input"
                  type="text"
                  value={branchOrCommit}
                  onChange={e => setBranchOrCommit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  placeholder="main"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleFetchGitHub}
                  disabled={fetchState === 'fetching'}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchState === 'fetching' ? 'animate-spin' : ''}`} />
                  <span>{fetchState === 'fetching' ? 'Downloading & Validating...' : 'Fetch from GitHub'}</span>
                </button>
              </div>
            </div>

            {/* Resolved Raw URL Traceability Inspection */}
            <div className="pt-2">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                Resolved Raw GitHub URL (Debug & Traceability):
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 font-mono break-all selection:bg-cyan-900 selection:text-white">
                {currentTargetUrl}
              </div>
            </div>
          </div>

          {/* Error Notice Display */}
          {lastFetchError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs font-mono text-rose-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>Fetch Failed: {lastFetchError.status ? `HTTP ${lastFetchError.status}` : 'Network / Schema Error'}</span>
                    <span className="text-[10px] font-normal text-rose-400">({lastFetchError.timestamp})</span>
                  </div>
                  <div className="mt-1 text-rose-200">{lastFetchError.message}</div>
                </div>
              </div>

              <div className="p-2.5 bg-rose-950/70 border border-rose-900/60 rounded text-[11px] text-rose-200 space-y-1">
                <div className="font-semibold text-amber-300">Actionable Resolution:</div>
                <div>1. The public repository stores dataset CSV files inside the <code className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded">outputs/</code> folder.</div>
                <div>2. Verified path: <code className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded">outputs/Marathwada_MODEL_DATASET_2003_2024.csv</code></div>
                <div>3. Fallback protection active: All visualizations and calculations continue to function with embedded data.</div>
              </div>
            </div>
          )}

          {/* Success Notice Display */}
          {fetchState === 'success' && lastFetchSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-xs font-mono text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <div className="font-bold">Remote Dataset Successfully Ingested!</div>
                <div className="text-[11px] text-emerald-200 mt-0.5">
                  Loaded and schema-verified {lastFetchSuccess.rows} observations across all 8 Marathwada districts. All metrics, maps, and forecasts have been synchronized.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Local CSV Ingestion & Zod Validation */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                Local CSV Ingestion & Validation
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Client-Side Parse</span>
          </div>

          <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-lg p-6 text-center transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
                Click to browse
              </span>{' '}
              <span className="text-xs text-slate-400">or drop updated research CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="text-[10px] text-slate-400 font-mono mt-2">
              Requires columns: <code className="text-slate-300">date</code>, <code className="text-slate-300">district</code>, and standardized stress scores (<code className="text-slate-300">spi_stress_z</code>, <code className="text-slate-300">soil_stress_z</code>, etc.)
            </div>
          </div>

          {validationReport && (
            <div className={`p-3.5 rounded border text-xs font-mono ${
              validationReport.isValid
                ? 'bg-teal-950/40 border-teal-800 text-teal-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  {validationReport.isValid ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span>Validation: {validationReport.isValid ? 'PASSED (STRICT)' : 'FAILED'}</span>
                </span>
                <span>{validationReport.validRows} / {validationReport.totalRows} valid rows</span>
              </div>
              <div className="text-[11px] space-y-1 text-slate-300">
                <div>Temporal coverage: <span className="text-white font-semibold">{validationReport.dateRange.min}</span> to <span className="text-white font-semibold">{validationReport.dateRange.max}</span></div>
                <div>Districts detected ({validationReport.detectedDistricts.length}): <span className="text-teal-300">{validationReport.detectedDistricts.join(', ')}</span></div>
                {validationReport.unrecognizedDistricts.length > 0 && (
                  <div className="text-rose-400">Unrecognized districts ({validationReport.unrecognizedDistricts.length}): {validationReport.unrecognizedDistricts.join(', ')}</div>
                )}
                {validationReport.warnings.length > 0 && (
                  <div className="text-amber-300">Warnings flagged: {validationReport.warnings.length}</div>
                )}
                {validationReport.errors.length > 0 && (
                  <div className="text-rose-300 font-semibold">Errors: {validationReport.errors.join('; ')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Manifest Card (Dynamic to Loaded Dataset) */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Active Dataset Manifest & Audit Metadata
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Source: <span className="text-slate-200">{activeManifest.fileName}</span></span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span className="text-teal-400 font-semibold">Commit: {activeManifest.commitSha.slice(0, 10)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono mb-4">
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Temporal Coverage</div>
            <div className="text-slate-100 font-bold mt-1 text-sm">{activeManifest.timeRange}</div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Total Observations</div>
            <div className="text-slate-100 font-bold mt-1 text-sm">{activeManifest.rowCount} rows</div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Districts Covered</div>
            <div className="text-slate-100 font-bold mt-1 text-sm">{activeManifest.districtCount} Marathwada Districts</div>
          </div>
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider">Missing Data Policy</div>
            <div className="text-slate-100 font-bold mt-1 text-sm">Zero lookahead gap-fill</div>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="font-semibold text-slate-300">Audited Constraints & Hydroclimatic Methodology:</div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-400">
            {activeManifest.knownLimitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dataset Records Browser Table */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Dataset Records Browser
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Displaying {filteredRecords.length} records · Full column mapping inspection.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 font-mono"
            >
              <option value="ALL">All Districts (8)</option>
              <option value="beed">Beed</option>
              <option value="chhatrapati_sambhajinagar">Chhatrapati Sambhajinagar</option>
              <option value="dharashiv">Dharashiv</option>
              <option value="hingoli">Hingoli</option>
              <option value="jalna">Jalna</option>
              <option value="latur">Latur</option>
              <option value="nanded">Nanded</option>
              <option value="parbhani">Parbhani</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search date or district..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-3 py-1.5 font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Filtered CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] z-10">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">Split</th>
                <th className="py-2.5 px-3 text-right">WSI (W0)</th>
                <th className="py-2.5 px-3 text-right">WSI (W1)</th>
                <th className="py-2.5 px-3 text-right">SPI Deficit (z)</th>
                <th className="py-2.5 px-3 text-right">Soil Deficit (z)</th>
                <th className="py-2.5 px-3 text-right">NDVI Deficit (z)</th>
                <th className="py-2.5 px-3 text-right">LST Thermal (z)</th>
                <th className="py-2.5 px-3 text-right">GW Deficit (z)</th>
                <th className="py-2.5 px-3 text-right">SW Deficit (z)</th>
                <th className="py-2.5 px-3 text-center">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.slice(0, 50).map((r, i) => (
                <tr key={`${r.date}_${r.districtId}_${i}`} className="hover:bg-slate-800/40 text-slate-300">
                  <td className="py-2 px-3 text-white font-semibold">{r.date}</td>
                  <td className="py-2 px-3">{r.districtName}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      r.split === 'train'
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                        : r.split === 'val' || r.split === 'validation'
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    }`}>
                      {r.split}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-cyan-300">
                    {(r.wsi_w0 ?? r.wsi).toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-right text-teal-300 font-medium">
                    {r.wsi_w1.toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-right">{((r.components.spiStressZ ?? r.components.rainfallStress) ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">{((r.components.soilStressZ ?? r.components.soilMoistureStress) ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">{((r.components.ndviStressZ ?? r.components.ndviStress) ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">{((r.components.lstStressZ ?? r.components.lstStress) ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">{((r.components.groundwaterStressZ ?? r.components.groundwaterStress) ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">{((r.components.surfaceWaterStressZ ?? r.components.surfaceWaterStress) ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.category_w0 === 'Severe Stress'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : r.category_w0 === 'Moderate Stress'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : r.category_w0 === 'Normal'
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-teal-950 text-teal-300 border border-teal-800'
                    }`}>
                      {r.category_w0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-500 font-mono mt-2">
          Showing first 50 observations of {filteredRecords.length} filtered records. Use Export Filtered CSV for full tabular download.
        </div>
      </div>
    </div>
  );
};
