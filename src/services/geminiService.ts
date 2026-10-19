import { GoogleGenAI } from '@google/genai';
import { DistrictId } from '../types/wsi';
import { MARATHWADA_DISTRICTS } from '../data/districts';
import { MARATHWADA_RESERVOIRS } from '../data/reservoirs';
import { calculateTankerRequirement } from '../data/policyProtocols';

export interface SitrepReport {
  districtName: string;
  marathiName: string;
  timestamp: string;
  headlineSummary: string;
  threatAssessmentLevel: 'Normal' | 'Advisory' | 'Severe Warning' | 'Emergency';
  keyStressDrivers: string[];
  immediateDirectives: string[];
  agriculturalAdvisories: string[];
  drinkingWaterContingency: string;
  marathiBriefing: string;
  generatedBy: 'Gemini 2.5 Flash' | 'Deterministic Grounded Engine';
}

/**
 * Generates an executive hydroclimatic situation report (SITREP)
 * grounded in real district telemetry, forecast values, and reservoir status.
 */
export async function generateDistrictSitrep(
  districtId: DistrictId,
  currentWsi: number,
  forecastH1: number,
  forecastH2: number,
  forecastH3: number,
  customApiKey?: string
): Promise<SitrepReport> {
  const district = MARATHWADA_DISTRICTS[districtId];
  const primaryDam = MARATHWADA_RESERVOIRS.find((d) => d.primaryDistrict === districtId) || MARATHWADA_RESERVOIRS[0];
  const tankerStats = calculateTankerRequirement(districtId, currentWsi);

  const apiKey =
    customApiKey?.trim() ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    '';

  const promptText = `
You are the Chief Hydrological & Disaster Intelligence Officer for the Maharashtra State Disaster Management Authority (SDMA).
Generate a factual, executive Hydroclimatic Situation Report (SITREP) for the following district based strictly on verified telemetry:

District: ${district.name} (${district.marathiName}), Maharashtra
Population: ${district.population2011.toLocaleString()} (Rural: ~${tankerStats.ruralPopulation.toLocaleString()})
Current Water Stress Index (WSI): ${currentWsi.toFixed(2)} (Threshold: <0.5 Normal, 0.5-1.5 Moderate, >=1.5 Severe)
3-Month Forward Forecast (Ridge Residual M5):
- H+1 (Next Month): WSI ${forecastH1.toFixed(2)}
- H+2 (Month 2): WSI ${forecastH2.toFixed(2)}
- H+3 (Month 3): WSI ${forecastH3.toFixed(2)}
Primary Water Reservoir: ${primaryDam.name} on ${primaryDam.river} River (Live Storage: ${primaryDam.currentLiveStorageTmc} TMC / ${primaryDam.currentStoragePercent}% of capacity)
Tanker Requirement Estimate: ${tankerStats.tankersRequiredPerDay} tankers/day supplying ${tankerStats.dailyWaterSuppliedLiters.toLocaleString()} L/day.

Instructions:
Respond in valid JSON format matching this schema:
{
  "headlineSummary": "2-3 sentence executive summary for the District Collector",
  "threatAssessmentLevel": "Normal" | "Advisory" | "Severe Warning" | "Emergency",
  "keyStressDrivers": ["Driver 1", "Driver 2", "Driver 3"],
  "immediateDirectives": ["Directive 1 for Municipal/Irrigation Dept", "Directive 2 for Tahsildar/Police", "Directive 3"],
  "agriculturalAdvisories": ["Advisory for Cotton/Soybean farmers", "Advisory on Irrigation/Borewells"],
  "drinkingWaterContingency": "Detailed protocol for reservoir reservation and tanker mobilization",
  "marathiBriefing": "A concise 3-4 sentence summary written in clean Marathi for local administrative gazettes"
}
`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || '';
      const parsed = JSON.parse(responseText);

      return {
        districtName: district.name,
        marathiName: district.marathiName,
        timestamp: new Date().toISOString(),
        headlineSummary: parsed.headlineSummary || '',
        threatAssessmentLevel: parsed.threatAssessmentLevel || 'Advisory',
        keyStressDrivers: Array.isArray(parsed.keyStressDrivers) ? parsed.keyStressDrivers : [],
        immediateDirectives: Array.isArray(parsed.immediateDirectives) ? parsed.immediateDirectives : [],
        agriculturalAdvisories: Array.isArray(parsed.agriculturalAdvisories) ? parsed.agriculturalAdvisories : [],
        drinkingWaterContingency: parsed.drinkingWaterContingency || '',
        marathiBriefing: parsed.marathiBriefing || '',
        generatedBy: 'Gemini 2.5 Flash',
      };
    } catch (err) {
      console.warn('[Gemini AI] API call failed or rate-limited, falling back to deterministic grounded engine:', err);
    }
  }

  // Factual deterministic fallback engine
  let threatLevel: 'Normal' | 'Advisory' | 'Severe Warning' | 'Emergency' = 'Normal';
  if (currentWsi >= 1.6 || forecastH1 >= 1.6) {
    threatLevel = 'Emergency';
  } else if (currentWsi >= 1.2 || forecastH1 >= 1.2) {
    threatLevel = 'Severe Warning';
  } else if (currentWsi >= 0.7) {
    threatLevel = 'Advisory';
  }

  const drivers = [
    `Current WSI index stands at ${currentWsi.toFixed(2)}, projecting to ${forecastH1.toFixed(2)} at H+1 horizon.`,
    `${primaryDam.name} live storage is currently at ${primaryDam.currentStoragePercent}% (${primaryDam.currentLiveStorageTmc} TMC).`,
    `Projected rural tanker demand requires ~${tankerStats.tankersRequiredPerDay} active vehicles supplying ${Math.round(tankerStats.dailyWaterSuppliedLiters / 1000)} kL/day.`,
  ];

  const directives = [
    `Mandate immediate audit of ${primaryDam.name} and enforce Section 31A drinking water priority reservation.`,
    `Direct Taluka Executive Magistrates to survey private agricultural wells within 2km of identified scarcity habitations.`,
    `Instruct District Supply Officer to pre-qualify GPS-tagged water tanker operators for immediate dispatch upon request.`,
  ];

  const agriAdvisories = [
    `Farmers in ${district.name} are advised to prioritize protective micro-drip irrigation for standing Kharif crops (Bt-Cotton / Soybean).`,
    `Delay or avoid fresh planting of high-water perennial sugarcane (Co-86032); transition to drought-resilient BDN-711 Tur or Maldandi Jowar.`,
  ];

  const drinkingContingency = `Halt all non-essential industrial allocations from ${primaryDam.name}. Requisition deep borewells for village community drinking water tanks and maintain emergency supply buffers.`;

  const marathi = `${district.marathiName} जिल्ह्यात जलताण निर्देशांक (WSI) ${currentWsi.toFixed(2)} नोंदवला गेला आहे. ${primaryDam.marathiName} मध्ये उपयुक्त पाणीसाठा ${primaryDam.currentStoragePercent}% शिल्लक असून पिण्याच्या पाण्याला सर्वोच्च प्राधान्य देण्यात आले आहे. आपत्कालीन परिस्थितीसाठी ${tankerStats.tankersRequiredPerDay} टँकर्स सज्ज ठेवण्याचे आदेश जिल्हा प्रशासनाला देण्यात आले आहेत.`;

  return {
    districtName: district.name,
    marathiName: district.marathiName,
    timestamp: new Date().toISOString(),
    headlineSummary: `${district.name} is experiencing ${threatLevel.toLowerCase()} hydrological conditions with a current WSI of ${currentWsi.toFixed(2)}. Forward multi-step ridge forecasting projects stress reaching ${forecastH1.toFixed(2)} at H+1, requiring proactive reservoir conservation.`,
    threatAssessmentLevel: threatLevel,
    keyStressDrivers: drivers,
    immediateDirectives: directives,
    agriculturalAdvisories: agriAdvisories,
    drinkingWaterContingency: drinkingContingency,
    marathiBriefing: marathi,
    generatedBy: 'Deterministic Grounded Engine',
  };
}
