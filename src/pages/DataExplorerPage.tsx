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
  Github,
  Info,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { HISTORICAL_WSI_RECORDS } from '../data/historicalData';
import {
  DEFAULT_BRANCH,
  EMBEDDED_MANIFEST,
  fetchCsvFromGitHub,
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER,
  KNOWN_DATASET_FILES,
} from '../services/githubFetcher';
import { validateAndParseCsv, ValidationReport } from '../utils/csvValidator';

export const DataExplorerPage: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<'final_model' | 'final_audit'>('final_model');
  const [branchOrCommit, setBranchOrCommit] = useState(DEFAULT_BRANCH);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  const selectedFile = KNOWN_DATASET_FILES.find(f => f.id === selectedFileId) || KNOWN_DATASET_FILES[0];

  // Handle GitHub Fetch
  const handleFetchGitHub = async () => {
    setIsFetching(true);
    setFetchError(null);

    const res = await fetchCsvFromGitHub(selectedFile.fileName, branchOrCommit);
    setIsFetching(false);

    if (res.success && res.report) {
      setValidationReport(res.report);
    } else {
      setFetchError(res.error || 'Failed to download or validate GitHub file.');
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
      }
    };
    reader.readAsText(file);
  };

  // Records to display in the preview table
  const activeRecords = validationReport ? validationReport.parsedRecords : HISTORICAL_WSI_RECORDS;

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

  // Download filtered CSV
  const handleExportCsv = () => {
    const headers = [
      'date',
      'year',
      'month',
      'district',
      'wsi_w0',
      'wsi_w1',
      'rainfall_stress',
      'soil_moisture_stress',
      'ndvi_stress',
      'lst_stress',
      'groundwater_stress',
      'surface_water_stress',
      'reservoir_storage_pct',
      'category_w0',
    ];

    const rows = filteredRecords.map(r => [
      r.date,
      r.year,
      r.month,
      r.districtName,
      r.wsi_w0,
      r.wsi_w1,
      r.components.rainfallStress,
      r.components.soilMoistureStress,
      r.components.ndviStress,
      r.components.lstStress,
      r.components.groundwaterStress,
      r.components.surfaceWaterStress,
      r.reservoirStoragePct ?? '',
      r.category_w0,
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>Data Ingestion & Integrity</span>
            <span aria-hidden="true">·</span>
            <span>GitHub Sync</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Zod Schema Validation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Data Explorer & Repository Synchronizer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect directly to <code className="text-cyan-300">sanzzzz-g/marathwada-drought-wsi</code> or inspect audited local records.
          </p>
        </div>

        <a
          href={`https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 transition-colors shrink-0"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Open GitHub Repository</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>
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
            <span className="text-[11px] font-mono text-teal-400">Public Repo</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label htmlFor="repo-dataset-select" className="text-slate-400 block mb-1">Target Committed CSV:</label>
              <select
                id="repo-dataset-select"
                value={selectedFileId}
                onChange={e => setSelectedFileId(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2"
              >
                {KNOWN_DATASET_FILES.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.fileName})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400 mt-1">{selectedFile.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="branch-commit-input" className="text-slate-400 block mb-1">Branch / Commit SHA:</label>
                <input
                  id="branch-commit-input"
                  type="text"
                  value={branchOrCommit}
                  onChange={e => setBranchOrCommit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2"
                  placeholder="main or SHA"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleFetchGitHub}
                  disabled={isFetching}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  <span>{isFetching ? 'Fetching...' : 'Fetch from GitHub'}</span>
                </button>
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded text-xs font-mono text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-bold">Fetch Notice:</div>
                <div>{fetchError}</div>
                <div className="text-[10px] text-rose-400 mt-1">
                  Falling back to embedded audited dataset (2003–2024, 2,112 rows).
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Local CSV Upload & Zod Validation */}
        <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
                Local CSV Ingestion & Validation
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Drag & Drop</span>
          </div>

          <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-lg p-6 text-center transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="text-xs font-medium text-cyan-400 hover:text-cyan-300">
                Click to browse
              </span>{' '}
              <span className="text-xs text-slate-400">or drop updated model CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="text-[10px] text-slate-400 font-mono mt-2">
              Requires columns: date (YYYY-MM), district, and component stress scores
            </div>
          </div>

          {validationReport && (
            <div className={`p-3 rounded border text-xs font-mono ${
              validationReport.isValid
                ? 'bg-teal-950/40 border-teal-800 text-teal-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span>Validation Result: {validationReport.isValid ? 'PASSED' : 'FAILED'}</span>
                <span>{validationReport.validRows} / {validationReport.totalRows} valid rows</span>
              </div>
              <div className="text-[11px] space-y-0.5">
                <div>Date span: {validationReport.dateRange.min} to {validationReport.dateRange.max}</div>
                <div>Districts: {validationReport.detectedDistricts.length} recognized</div>
                {validationReport.warnings.length > 0 && (
                  <div className="text-amber-300">Warnings: {validationReport.warnings.length}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Manifest Card (Master prompt Section 12) */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Active Dataset Manifest & Audit Metadata
            </h2>
          </div>
          <span className="text-xs font-mono text-teal-400">Commit: {EMBEDDED_MANIFEST.commitSha}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono mb-4">
          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Time Range</div>
            <div className="text-slate-200 font-bold mt-0.5">{EMBEDDED_MANIFEST.timeRange}</div>
          </div>
          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Row Count</div>
            <div className="text-slate-200 font-bold mt-0.5">{EMBEDDED_MANIFEST.rowCount} observations</div>
          </div>
          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Districts Covered</div>
            <div className="text-slate-200 font-bold mt-0.5">{EMBEDDED_MANIFEST.districtCount} Marathwada districts</div>
          </div>
          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-slate-400 text-[10px]">Missing Data Policy</div>
            <div className="text-slate-200 font-bold mt-0.5">Zero lookahead gap-fill</div>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">Known Limitations & Constraints:</div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-400">
            {EMBEDDED_MANIFEST.knownLimitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dataset Table Preview */}
      <div className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Dataset Records Browser
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Showing {filteredRecords.length} records · Full column mapping inspection.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search date or district..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-3 py-1.5 font-mono"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Filtered CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
              <tr>
                <th className="py-2 px-2.5">Date</th>
                <th className="py-2 px-2.5">District</th>
                <th className="py-2 px-2.5 text-right">WSI (W0)</th>
                <th className="py-2 px-2.5 text-right">Rain Stress</th>
                <th className="py-2 px-2.5 text-right">Soil Moisture</th>
                <th className="py-2 px-2.5 text-right">NDVI (VCI)</th>
                <th className="py-2 px-2.5 text-right">LST Heat</th>
                <th className="py-2 px-2.5 text-right">Groundwater</th>
                <th className="py-2 px-2.5 text-right">Surface Water</th>
                <th className="py-2 px-2.5 text-right">Reservoir %</th>
                <th className="py-2 px-2.5 text-center">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.slice(0, 50).map((r, i) => (
                <tr key={`${r.date}_${r.districtId}_${i}`} className="hover:bg-slate-800/30 text-slate-300">
                  <td className="py-1.5 px-2.5 text-white font-semibold">{r.date}</td>
                  <td className="py-1.5 px-2.5">{r.districtName}</td>
                  <td className="py-1.5 px-2.5 text-right font-bold text-cyan-300">
                    {(r.wsi_w0 ?? r.wsi).toFixed(3)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right">{((r.components.spiStressZ ?? r.components.rainfallStress) ?? 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right">{((r.components.soilStressZ ?? r.components.soilMoistureStress) ?? 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right">{((r.components.ndviStressZ ?? r.components.ndviStress) ?? 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right">{((r.components.lstStressZ ?? r.components.lstStress) ?? 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right">{((r.components.groundwaterStressZ ?? r.components.groundwaterStress) ?? 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right">{((r.components.surfaceWaterStressZ ?? r.components.surfaceWaterStress) ?? 0).toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right text-slate-400">
                    {r.reservoirStoragePct ? `${r.reservoirStoragePct}%` : 'N/A'}
                  </td>
                  <td className="py-1.5 px-2.5 text-center text-teal-400 text-[11px]">
                    {r.dataQualityFlag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
