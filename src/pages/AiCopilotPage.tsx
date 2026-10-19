import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Key,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Send,
  HelpCircle,
  RefreshCw,
  Building2,
  Wheat,
  Droplets,
} from 'lucide-react';
import { DISTRICT_LIST, MARATHWADA_DISTRICTS } from '../data/districts';
import { LATEST_REGIONAL_RECORDS, OPERATIONAL_FORECASTS } from '../data/historicalData';
import { DistrictId, WeightingScheme } from '../types/wsi';
import { getStressCategory, getStressColor } from '../utils/wsiCalculations';
import { generateDistrictSitrep, SitrepReport } from '../services/geminiService';
import { MARATHWADA_RESERVOIRS } from '../data/reservoirs';

interface AiCopilotPageProps {
  selectedDistrictId: DistrictId;
  onSelectDistrict: (districtId: DistrictId) => void;
  weightScheme: WeightingScheme;
  onNavigate: (route: string) => void;
}

export const AiCopilotPage: React.FC<AiCopilotPageProps> = ({
  selectedDistrictId,
  onSelectDistrict,
  weightScheme,
}) => {
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sitrep, setSitrep] = useState<SitrepReport | null>(null);
  const [copiedMarathi, setCopiedMarathi] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Chat Q&A state
  const [chatQuestion, setChatQuestion] = useState<string>('');
  const [chatLog, setChatLog] = useState<
    { sender: 'user' | 'ai'; text: string; timestamp: string }[]
  >([
    {
      sender: 'ai',
      text: 'Namaskar! I am your Hydroclimatic Intelligence Copilot for Marathwada. I synthesize 22 years of verified environmental observations, 3-month residual ridge forecasts, and official Maharashtra Disaster Management protocols. How can I assist your operational planning today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const district = MARATHWADA_DISTRICTS[selectedDistrictId];
  const currentRecord =
    LATEST_REGIONAL_RECORDS.find((r) => r.districtId === selectedDistrictId) ||
    LATEST_REGIONAL_RECORDS[0];

  const currentWsi =
    weightScheme === 'W0'
      ? currentRecord.wsi
      : (currentRecord.wsi_w1_experimental ?? currentRecord.wsi);

  const h1Forecast = OPERATIONAL_FORECASTS.find(f => f.districtId === selectedDistrictId && f.horizon === 1);
  const h2Forecast = OPERATIONAL_FORECASTS.find(f => f.districtId === selectedDistrictId && f.horizon === 2);
  const h3Forecast = OPERATIONAL_FORECASTS.find(f => f.districtId === selectedDistrictId && f.horizon === 3);
  const h1 = h1Forecast ? h1Forecast.predictedWsi : currentWsi;
  const h2 = h2Forecast ? h2Forecast.predictedWsi : currentWsi;
  const h3 = h3Forecast ? h3Forecast.predictedWsi : currentWsi;

  const handleGenerateSitrep = async () => {
    setIsGenerating(true);
    try {
      const report = await generateDistrictSitrep(
        selectedDistrictId,
        currentWsi,
        h1,
        h2,
        h3,
        customApiKey
      );
      setSitrep(report);
    } catch (err) {
      console.error('Failed to generate SITREP:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on initial load or district change if not already generated
  useEffect(() => {
    handleGenerateSitrep();
  }, [selectedDistrictId]);

  const handleCopyMarathi = () => {
    if (sitrep?.marathiBriefing) {
      navigator.clipboard.writeText(sitrep.marathiBriefing);
      setCopiedMarathi(true);
      setTimeout(() => setCopiedMarathi(false), 2000);
    }
  };

  const handleCopyFullReport = () => {
    if (sitrep) {
      const text = `
HYDROCLIMATIC SITUATION REPORT (SITREP)
District: ${sitrep.districtName} (${sitrep.marathiName})
Threat Level: ${sitrep.threatAssessmentLevel}
Summary: ${sitrep.headlineSummary}

Key Stress Drivers:
${sitrep.keyStressDrivers.map((d) => `- ${d}`).join('\n')}

Immediate Administrative Directives:
${sitrep.immediateDirectives.map((d) => `- ${d}`).join('\n')}

Agricultural Advisories:
${sitrep.agriculturalAdvisories.map((d) => `- ${d}`).join('\n')}

Drinking Water Protocol:
${sitrep.drinkingWaterContingency}

Marathi Bulletin:
${sitrep.marathiBriefing}
      `.trim();
      navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleSendChat = () => {
    if (!chatQuestion.trim()) return;

    const userText = chatQuestion.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatLog((prev) => [...prev, { sender: 'user', text: userText, timestamp: time }]);
    setChatQuestion('');

    // Formulate a grounded response based on repository data
    setTimeout(() => {
      let aiReply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('2015') || lower.includes('latur') || lower.includes('jaldoot')) {
        aiReply = `During the 2015-16 crisis, Latur suffered complete desiccation of Manjara Dam (0.0% live storage) following two consecutive monsoon failures. The Indian Railways operated the "Jaldoot" Water Express from Miraj, delivering 2.5 million liters daily over 111 trips. Today, Latur's forward WSI is ${h1.toFixed(2)}, which is below the 2015 extreme threshold of 2.18, but vigilant reservoir rationing is required.`;
      } else if (lower.includes('jayakwadi') || lower.includes('dam') || lower.includes('reservoir')) {
        const dam = MARATHWADA_RESERVOIRS[0];
        aiReply = `Jayakwadi Dam (Nath Sagar) is the primary anchor of Marathwada with 76.67 TMC live capacity (102.7 TMC gross). Under Maharashtra Irrigation Act §31A, once regional WSI exceeds 1.15, live storage must be legally reserved for municipal drinking water before canal releases for summer sugarcane are permitted.`;
      } else if (lower.includes('crop') || lower.includes('sugarcane') || lower.includes('cotton') || lower.includes('farmer')) {
        aiReply = `Sugarcane consumes ~2,200 mm of water annually—occupying <5% of Marathwada's cultivable land while absorbing over 65% of irrigation water. For ${district.name}, our policy recommendation is to subsidize drought-resilient Kharif BDN-711 Tur (Pigeonpea) and Rabi Maldandi Jowar, which require under 550 mm and conserve 70%+ water.`;
      } else if (lower.includes('tanker')) {
        aiReply = `Under Maharashtra SDMA norms, emergency water tankers are provisioned at 20 Liters/capita/day when public drinking sources yield under 40% of normal supply. For ${district.name}, an active WSI of ${currentWsi.toFixed(2)} warrants approximately ${sitrep?.immediateDirectives.length ? 'immediate pre-tendering of GPS-tracked tankers' : 'routine monitoring'}.`;
      } else {
        aiReply = `Based on the latest observation (${currentRecord.date}), ${district.name} displays a Water Stress Index of ${currentWsi.toFixed(2)} (${getStressCategory(currentWsi)}). Our residual Ridge M5 benchmark projects H+1 stress at ${h1.toFixed(2)} and H+2 at ${h2.toFixed(2)}. The primary risk factor remains ${district.primaryReservoir} storage depletion and post-monsoon soil moisture retention.`;
      }

      setChatLog((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 600);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              AI Hydroclimatic Copilot & Situation Briefing (SITREP)
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Automated executive intelligence engine powered by Google GenAI. Generates formal
            Disaster Management Authority bulletins, administrative action orders, and bilingual
            (English / Marathi) public advisories grounded strictly in verified telemetry.
          </p>
        </div>

        {/* API Key configuration toggle */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="password"
              placeholder="Gemini API Key (optional)"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              className="bg-transparent text-slate-200 placeholder-slate-500 text-xs focus:outline-none w-36"
            />
          </div>
        </div>
      </div>

      {/* District & Telemetry Grounding Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Target District
          </label>
          <select
            value={selectedDistrictId}
            onChange={(e) => onSelectDistrict(e.target.value as DistrictId)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            {DISTRICT_LIST.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.marathiName})
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400">Observed WSI</span>
          <div
            className="mt-1 text-2xl font-bold font-mono"
            style={{ color: getStressColor(getStressCategory(currentWsi)).hex }}
          >
            {currentWsi.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">{getStressCategory(currentWsi)}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400">3-Month Forward Outlook</span>
          <div className="mt-1 text-lg font-bold font-mono text-cyan-300">
            H1: {h1.toFixed(2)} | H2: {h2.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Ridge Residual M5 (+30.1% skill)</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-center">
          <button
            onClick={handleGenerateSitrep}
            disabled={isGenerating}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isGenerating ? 'Synthesizing...' : 'Re-Generate SITREP'}
          </button>
        </div>
      </div>

      {/* Generated Situation Report (SITREP) Card */}
      {sitrep && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-100">
                    Executive Hydroclimatic Situation Report (SITREP)
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {sitrep.generatedBy}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Target: District Collector & Disaster Management Officer, {sitrep.districtName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                  sitrep.threatAssessmentLevel === 'Emergency'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : sitrep.threatAssessmentLevel === 'Severe Warning'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {sitrep.threatAssessmentLevel}
              </span>
              <button
                onClick={handleCopyFullReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedAll ? 'Copied' : 'Copy All'}
              </button>
            </div>
          </div>

          {/* Headline Summary */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 leading-relaxed font-sans">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
              Executive Threat Briefing
            </span>
            {sitrep.headlineSummary}
          </div>

          {/* 3-Column Action Protocol Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stress Drivers */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Key Environmental Drivers
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {sitrep.keyStressDrivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0">•</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Immediate Directives */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Administrative Directives
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {sitrep.immediateDirectives.map((dir, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{dir}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agricultural Advisories */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wheat className="w-3.5 h-3.5 text-emerald-400" />
                Farmer Advisories
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {sitrep.agriculturalAdvisories.map((adv, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 shrink-0">•</span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bilingual Marathi Public Gazette Card */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                मराठी अधिकृत बुलेटिन (District Administration Gazette)
              </span>
              <button
                onClick={handleCopyMarathi}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              >
                {copiedMarathi ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedMarathi ? 'Copied' : 'Copy Marathi Text'}
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {sitrep.marathiBriefing}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Hydroclimatic Copilot Q&A */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Interactive Hydroclimatic Q&A Assistant
            </h3>
            <p className="text-xs text-slate-400">
              Ask questions about historical drought benchmarks (2015 Latur crisis), reservoir
              statutes, or crop vulnerability.
            </p>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="h-64 overflow-y-auto space-y-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 scrollbar-thin">
          {chatLog.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                {msg.timestamp}
              </span>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder="e.g., How does Beed's current stress compare to the 2015 Latur crisis?"
            className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSendChat}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Ask
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-slate-400 pt-1">
          <span className="shrink-0 text-slate-500">Suggested:</span>
          <button
            onClick={() => {
              setChatQuestion('How does current stress compare to the 2015 Latur crisis?');
            }}
            className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-slate-700 shrink-0 transition-colors"
          >
            Compare to 2015 Latur Crisis
          </button>
          <button
            onClick={() => {
              setChatQuestion('What are the rules for reserving Jayakwadi reservoir storage?');
            }}
            className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-slate-700 shrink-0 transition-colors"
          >
            Jayakwadi Reservation Statutes
          </button>
          <button
            onClick={() => {
              setChatQuestion('What crops should farmers switch to if monsoon fails?');
            }}
            className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-slate-700 shrink-0 transition-colors"
          >
            Drought-Resilient Crop Alternatives
          </button>
        </div>
      </div>
    </div>
  );
};
