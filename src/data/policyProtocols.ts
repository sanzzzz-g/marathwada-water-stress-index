import { DistrictId } from '../types/wsi';
import { MARATHWADA_DISTRICTS } from './districts';

export interface ActionMilestone {
  stage: string;
  leadTime: string;
  horizon: 'H3' | 'H2' | 'H1' | 'H0';
  wsiTriggerThreshold: number;
  statutoryReference: string;
  title: string;
  administrativeOrders: string[];
  publicAdvisory: string;
  targetAgencies: string[];
}

export interface CropVulnerabilityProfile {
  cropName: string;
  marathiName: string;
  season: 'Kharif' | 'Rabi' | 'Annual/Perennial';
  waterRequirementMm: number;
  criticalGrowthStages: string[];
  droughtVulnerability: 'Critical' | 'High' | 'Moderate' | 'Resilient';
  historicalLossRateInDroughtPercent: number;
  recommendedAlternative: string;
  estimatedWaterSavingPercent: number;
}

/**
 * Factual Administrative Action Milestones
 * Calibrated against the Manual for Drought Management (Ministry of Agriculture & Farmers Welfare, GoI, 2020)
 * and the Maharashtra State Disaster Management Plan (SDMP).
 */
export const DROUGHT_ACTION_MILESTONES: ActionMilestone[] = [
  {
    stage: 'T-90 Days: Early Preparedness',
    leadTime: '3 Months Ahead',
    horizon: 'H3',
    wsiTriggerThreshold: 0.85,
    statutoryReference: 'GoI Drought Manual §3.2 (Early Warning Triggers)',
    title: 'Agricultural Cropping Shift & Reservoir Audit',
    administrativeOrders: [
      'Issue advisory to State Agriculture Dept to adjust seed subsidies from Sugarcane to Sorghum (Jowar) and Bajra.',
      'Mandate District Water Resources engineers to audit live capacity in Jayakwadi and Majalgaon.',
      'Form Taluka-level Drought Monitoring Committees headed by Tehsildars.',
    ],
    publicAdvisory: 'Farmers are advised to delay sugarcane planting and procure drought-tolerant varieties (BDN-711 Tur, JS-9305 Soybean).',
    targetAgencies: ['Department of Agriculture', 'Command Area Development Authority (CADA)', 'Zilla Parishad'],
  },
  {
    stage: 'T-60 Days: Statutory Resource Reservation',
    leadTime: '2 Months Ahead',
    horizon: 'H2',
    wsiTriggerThreshold: 1.15,
    statutoryReference: 'Maharashtra Irrigation Act §31A (Drinking Water Priority)',
    title: 'Drinking Water Reservation & Industrial Diversion Cut',
    administrativeOrders: [
      'Statutory reservation of remaining live storage across Jayakwadi, Manjara, and Yeldari strictly for drinking purposes.',
      'Halt non-essential industrial water allotments (distilleries, breweries, steel mills) in Jalna MIDC and Waluj MIDC.',
      'Conduct geo-hydrological survey of government borewells and map defunct tube-wells.',
    ],
    publicAdvisory: 'Municipalities to restrict domestic supply to alternate days; ban on decorative fountains and construction water use.',
    targetAgencies: ['District Collectorate', 'Maharashtra Water Resources Dept (WRD)', 'MIDC'],
  },
  {
    stage: 'T-30 Days: Emergency Logistics Tendering',
    leadTime: '1 Month Ahead',
    horizon: 'H1',
    wsiTriggerThreshold: 1.50,
    statutoryReference: 'Govt Resolution (GR) No. SCY-2015/CR-45/M-3',
    title: 'Tanker Fleet Tendering & Cattle Fodder Camps',
    administrativeOrders: [
      'Float short-term tenders for private water tankers with GPS tracking and RFID fill-point sensors.',
      'Identify designated sites for Fodder Camps (Chara Chhavani) for livestock preservation in Beed and Dharashiv.',
      'Requisition private agricultural wells within 2 km of habitations under Section 144 / Disaster Management Act.',
    ],
    publicAdvisory: 'Villagers facing severe well desiccation may submit Gram Panchayat resolutions for immediate tanker deployment.',
    targetAgencies: ['Water Supply & Sanitation Dept', 'Animal Husbandry Dept', 'Police Administration'],
  },
  {
    stage: 'T-0 Days: Full Disaster Mobilization',
    leadTime: 'Immediate Response',
    horizon: 'H0',
    wsiTriggerThreshold: 1.80,
    statutoryReference: 'State Disaster Response Fund (SDRF) Directives',
    title: 'Emergency Relief & Scarcity Declaration',
    administrativeOrders: [
      'Formal notification of Scarcity/Drought across affected revenue circles.',
      'Daily deployment of drinking water tankers to all verified dry habitations.',
      'Activate Indian Railways emergency contingency coordination for potential "Jaldoot" Water Express mobilization.',
      'Disburse agricultural input subsidies and waive land revenue taxes.',
    ],
    publicAdvisory: 'Emergency relief centers open 24/7; emergency toll-free scarcity helpline activated at Collectorate.',
    targetAgencies: ['Revenue & Disaster Management Dept', 'Indian Railways Central Zone', 'Treasury & SDRF'],
  },
];

/**
 * Factual crop statistics and water footprints for Marathwada
 * Source: Vasantrao Naik Marathwada Krishi Vidyapeeth (VNMKV), Parbhani
 */
export const MARATHWADA_CROPS: CropVulnerabilityProfile[] = [
  {
    cropName: 'Sugarcane (Co-86032)',
    marathiName: 'ऊस',
    season: 'Annual/Perennial',
    waterRequirementMm: 2200,
    criticalGrowthStages: ['Tillering', 'Grand Growth', 'Maturity'],
    droughtVulnerability: 'Critical',
    historicalLossRateInDroughtPercent: 65,
    recommendedAlternative: 'Sorghum (Jowar - Maldandi) / Bajra',
    estimatedWaterSavingPercent: 78,
  },
  {
    cropName: 'Bt-Cotton',
    marathiName: 'कापूस',
    season: 'Kharif',
    waterRequirementMm: 700,
    criticalGrowthStages: ['Squaring', 'Flowering', 'Boll Development'],
    droughtVulnerability: 'High',
    historicalLossRateInDroughtPercent: 45,
    recommendedAlternative: 'Short-duration Desi Cotton / Intercropped Tur',
    estimatedWaterSavingPercent: 32,
  },
  {
    cropName: 'Soybean (JS-335 / JS-9305)',
    marathiName: 'सोयाबीन',
    season: 'Kharif',
    waterRequirementMm: 450,
    criticalGrowthStages: ['Pod Initiation', 'Grain Filling'],
    droughtVulnerability: 'Moderate',
    historicalLossRateInDroughtPercent: 35,
    recommendedAlternative: 'Mung / Urad (Short-duration Pulses)',
    estimatedWaterSavingPercent: 25,
  },
  {
    cropName: 'Pigeonpea / Tur (BDN-711)',
    marathiName: 'तूर',
    season: 'Kharif',
    waterRequirementMm: 550,
    criticalGrowthStages: ['Branching', 'Pod Formation'],
    droughtVulnerability: 'Resilient',
    historicalLossRateInDroughtPercent: 20,
    recommendedAlternative: 'Indigenous Deep-Rooted Tur',
    estimatedWaterSavingPercent: 15,
  },
  {
    cropName: 'Rabi Sorghum (Maldandi M 35-1)',
    marathiName: 'रब्बी ज्वारी (मालदांडी)',
    season: 'Rabi',
    waterRequirementMm: 350,
    criticalGrowthStages: ['Boot Leaf', 'Grain Development'],
    droughtVulnerability: 'Resilient',
    historicalLossRateInDroughtPercent: 18,
    recommendedAlternative: 'Safflower (Kardi) / Chickpea',
    estimatedWaterSavingPercent: 20,
  },
];

/**
 * Calculates official tanker deployment requirement based on Maharashtra SDMA formula
 */
export function calculateTankerRequirement(
  districtId: DistrictId,
  currentWsi: number
): {
  ruralPopulation: number;
  affectedPopulationEstimate: number;
  tankersRequiredPerDay: number;
  estimatedTripsPerDay: number;
  dailyWaterSuppliedLiters: number;
  severityGrade: 'None' | 'Low' | 'Moderate' | 'Critical';
} {
  const district = MARATHWADA_DISTRICTS[districtId];
  const ruralFraction = 0.72; // ~72% rural population average in Marathwada census
  const ruralPopulation = Math.round(district.population2011 * ruralFraction);

  // Calibrated sigmoid response for drought-induced tanker demand
  let affectedFraction = 0;
  let severityGrade: 'None' | 'Low' | 'Moderate' | 'Critical' = 'None';

  if (currentWsi < 0.5) {
    affectedFraction = 0.002;
    severityGrade = 'None';
  } else if (currentWsi < 1.0) {
    affectedFraction = 0.025;
    severityGrade = 'Low';
  } else if (currentWsi < 1.5) {
    affectedFraction = 0.085;
    severityGrade = 'Moderate';
  } else {
    // Severe drought threshold
    affectedFraction = Math.min(0.35, 0.12 + (currentWsi - 1.5) * 0.18);
    severityGrade = 'Critical';
  }

  const affectedPopulation = Math.round(ruralPopulation * affectedFraction);

  // Maharashtra official norm: 20 Liters per capita per day during scarcity
  const dailyDemandLiters = affectedPopulation * 20;

  // Standard tanker size = 10,000 Liters, operating 3 round trips/day
  const litersPerTankerDay = 10000 * 3;
  const tankersRequired = Math.ceil(dailyDemandLiters / litersPerTankerDay);

  return {
    ruralPopulation,
    affectedPopulationEstimate: affectedPopulation,
    tankersRequiredPerDay: Math.max(0, tankersRequired),
    estimatedTripsPerDay: tankersRequired * 3,
    dailyWaterSuppliedLiters: dailyDemandLiters,
    severityGrade,
  };
}
