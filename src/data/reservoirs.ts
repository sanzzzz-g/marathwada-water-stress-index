import { DistrictId } from '../types/wsi';

export interface ReservoirData {
  id: string;
  name: string;
  marathiName: string;
  river: string;
  basin: string;
  primaryDistrict: DistrictId;
  beneficiaryDistricts: DistrictId[];
  grossCapacityTmc: number; // TMC (Thousand Million Cubic feet)
  liveCapacityTmc: number;  // Live Storage in TMC
  deadStorageTmc: number;   // Dead Storage in TMC
  grossCapacityMcm: number; // Million Cubic Meters
  liveCapacityMcm: number;
  fullReservoirLevelM: number; // FRL in meters
  currentLevelM: number;
  currentLiveStorageTmc: number;
  currentStoragePercent: number; // % of live storage
  downstreamReservoirId?: string;
  coordinates: [number, number]; // [lat, lng]
  irrigationPotentialHa: number; // Hectares
  drinkingWaterPriorityUrban: string[];
  historicalLowYear: {
    year: number;
    lowestPercent: number;
    description: string;
  };
}

/**
 * Factual specifications for Major Reservoirs in Marathwada
 * Grounded in Central Water Commission (CWC) National Register of Large Dams
 * and Maharashtra Water Resources Department (WRD) official reports.
 */
export const MARATHWADA_RESERVOIRS: ReservoirData[] = [
  {
    id: 'jayakwadi',
    name: 'Jayakwadi Dam (Nath Sagar, Paithan)',
    marathiName: 'जायकवाडी धरण (नाथसागर, पैठण)',
    river: 'Godavari',
    basin: 'Godavari Basin',
    primaryDistrict: 'csn',
    beneficiaryDistricts: ['csn', 'jalna', 'parbhani', 'beed', 'nanded'],
    grossCapacityTmc: 102.73,
    liveCapacityTmc: 76.67,
    deadStorageTmc: 26.06,
    grossCapacityMcm: 2909,
    liveCapacityMcm: 2171,
    fullReservoirLevelM: 463.90,
    currentLevelM: 457.20,
    currentLiveStorageTmc: 32.20,
    currentStoragePercent: 42.0,
    downstreamReservoirId: 'vishnupuri',
    coordinates: [19.4936, 75.3789],
    irrigationPotentialHa: 237452,
    drinkingWaterPriorityUrban: ['Chhatrapati Sambhajinagar', 'Jalna MIDC', 'Paithan'],
    historicalLowYear: {
      year: 2015,
      lowestPercent: 1.8,
      description: 'Dropped to dead storage buffer during the severe 2015 drought.',
    },
  },
  {
    id: 'majalgaon',
    name: 'Majalgaon Dam',
    marathiName: 'माजलगाव धरण',
    river: 'Sindphana',
    basin: 'Godavari Sub-basin',
    primaryDistrict: 'beed',
    beneficiaryDistricts: ['beed', 'parbhani', 'nanded'],
    grossCapacityTmc: 16.03,
    liveCapacityTmc: 11.00,
    deadStorageTmc: 5.03,
    grossCapacityMcm: 454,
    liveCapacityMcm: 311,
    fullReservoirLevelM: 431.80,
    currentLevelM: 426.10,
    currentLiveStorageTmc: 3.85,
    currentStoragePercent: 35.0,
    downstreamReservoirId: 'vishnupuri',
    coordinates: [19.1417, 76.2239],
    irrigationPotentialHa: 91580,
    drinkingWaterPriorityUrban: ['Majalgaon', 'Beed city', 'Parli Thermal Power Plant'],
    historicalLowYear: {
      year: 2019,
      lowestPercent: 0.0,
      description: 'Hit zero live storage; water pumped from dead storage for Parli.',
    },
  },
  {
    id: 'yeldari',
    name: 'Yeldari Dam',
    marathiName: 'येलदरी धरण',
    river: 'Purna',
    basin: 'Godavari Sub-basin',
    primaryDistrict: 'hingoli',
    beneficiaryDistricts: ['hingoli', 'parbhani', 'nanded'],
    grossCapacityTmc: 33.00,
    liveCapacityTmc: 28.60,
    deadStorageTmc: 4.40,
    grossCapacityMcm: 934,
    liveCapacityMcm: 810,
    fullReservoirLevelM: 459.94,
    currentLevelM: 453.80,
    currentLiveStorageTmc: 13.73,
    currentStoragePercent: 48.0,
    downstreamReservoirId: 'siddheshwar',
    coordinates: [19.7214, 76.7381],
    irrigationPotentialHa: 104000,
    drinkingWaterPriorityUrban: ['Hingoli', 'Jintur', 'Parbhani'],
    historicalLowYear: {
      year: 2015,
      lowestPercent: 4.2,
      description: 'Critical depletion severely hit downstream Purna command canal systems.',
    },
  },
  {
    id: 'siddheshwar',
    name: 'Siddheshwar Dam',
    marathiName: 'सिद्धेश्वर धरण',
    river: 'Purna',
    basin: 'Godavari Sub-basin',
    primaryDistrict: 'hingoli',
    beneficiaryDistricts: ['hingoli', 'nanded', 'parbhani'],
    grossCapacityTmc: 8.86,
    liveCapacityTmc: 2.86,
    deadStorageTmc: 6.00,
    grossCapacityMcm: 251,
    liveCapacityMcm: 81,
    fullReservoirLevelM: 415.54,
    currentLevelM: 412.30,
    currentLiveStorageTmc: 1.12,
    currentStoragePercent: 39.0,
    downstreamReservoirId: 'vishnupuri',
    coordinates: [19.6053, 77.0142],
    irrigationPotentialHa: 52000,
    drinkingWaterPriorityUrban: ['Aundha Nagnath', 'Basmat'],
    historicalLowYear: {
      year: 2016,
      lowestPercent: 0.0,
      description: 'Dry reservoir bed; downstream pick-up weir completely desiccated.',
    },
  },
  {
    id: 'manjara',
    name: 'Manjara Dam (Dhanegaon)',
    marathiName: 'मांजरा धरण (धनेगाव)',
    river: 'Manjara',
    basin: 'Krishna-Godavari Inter-basin',
    primaryDistrict: 'beed',
    beneficiaryDistricts: ['beed', 'latur', 'dharashiv'],
    grossCapacityTmc: 7.91,
    liveCapacityTmc: 6.25,
    deadStorageTmc: 1.66,
    grossCapacityMcm: 224,
    liveCapacityMcm: 177,
    fullReservoirLevelM: 642.37,
    currentLevelM: 636.50,
    currentLiveStorageTmc: 1.38,
    currentStoragePercent: 22.0,
    coordinates: [18.7297, 76.1086],
    irrigationPotentialHa: 48300,
    drinkingWaterPriorityUrban: ['Latur Municipal Corp', 'Ambejogai', 'Kaij'],
    historicalLowYear: {
      year: 2016,
      lowestPercent: 0.0,
      description: 'Complete desiccation prompted Indian Railways "Jaldoot" Water Express to Latur.',
    },
  },
  {
    id: 'vishnupuri',
    name: 'Vishnupuri Barrage (Asana/Godavari)',
    marathiName: 'विष्णुपूरी बंधारा',
    river: 'Godavari',
    basin: 'Godavari Mainstem',
    primaryDistrict: 'nanded',
    beneficiaryDistricts: ['nanded'],
    grossCapacityTmc: 2.86,
    liveCapacityTmc: 2.86,
    deadStorageTmc: 0.00,
    grossCapacityMcm: 81,
    liveCapacityMcm: 81,
    fullReservoirLevelM: 355.00,
    currentLevelM: 353.40,
    currentLiveStorageTmc: 1.63,
    currentStoragePercent: 57.0,
    coordinates: [19.1256, 77.2917],
    irrigationPotentialHa: 28500,
    drinkingWaterPriorityUrban: ['Nanded-Waghala City', 'MIDC Nanded'],
    historicalLowYear: {
      year: 2016,
      lowestPercent: 8.0,
      description: 'Maintained through emergency release from upper dams.',
    },
  },
  {
    id: 'lower_dudhna',
    name: 'Lower Dudhna Dam',
    marathiName: 'निम्न दुधना धरण',
    river: 'Dudhna',
    basin: 'Godavari Sub-basin',
    primaryDistrict: 'jalna',
    beneficiaryDistricts: ['jalna', 'parbhani'],
    grossCapacityTmc: 8.55,
    liveCapacityTmc: 6.42,
    deadStorageTmc: 2.13,
    grossCapacityMcm: 242,
    liveCapacityMcm: 182,
    fullReservoirLevelM: 457.50,
    currentLevelM: 451.20,
    currentLiveStorageTmc: 1.93,
    currentStoragePercent: 30.0,
    coordinates: [19.5714, 76.1458],
    irrigationPotentialHa: 36000,
    drinkingWaterPriorityUrban: ['Partur', 'Selu', 'Mantha'],
    historicalLowYear: {
      year: 2019,
      lowestPercent: 2.1,
      description: 'Severe agricultural distress across Dudhna canal belt.',
    },
  },
  {
    id: 'sina_kolegaon',
    name: 'Sina Kolegaon Dam',
    marathiName: 'सीना कोळेगाव धरण',
    river: 'Sina',
    basin: 'Bhima-Krishna Basin',
    primaryDistrict: 'dharashiv',
    beneficiaryDistricts: ['dharashiv', 'beed'],
    grossCapacityTmc: 5.30,
    liveCapacityTmc: 3.46,
    deadStorageTmc: 1.84,
    grossCapacityMcm: 150,
    liveCapacityMcm: 98,
    fullReservoirLevelM: 508.50,
    currentLevelM: 503.10,
    currentLiveStorageTmc: 0.69,
    currentStoragePercent: 20.0,
    coordinates: [18.4239, 75.6417],
    irrigationPotentialHa: 24000,
    drinkingWaterPriorityUrban: ['Paranda', 'Bhoom', 'Karmala'],
    historicalLowYear: {
      year: 2018,
      lowestPercent: 0.0,
      description: 'Dried up for 14 consecutive months during 2018–2019 drought.',
    },
  },
];

/**
 * Calculates simulated downstream stress delta given a release from an upstream dam
 */
export function simulateDamRelease(
  upstreamDamId: string,
  releaseTmc: number
): {
  upstreamRemainingTmc: number;
  upstreamNewPercent: number;
  downstreamBeneficiaries: {
    districtId: DistrictId;
    stressReliefWsi: number;
    estimatedWaterAddedMcm: number;
  }[];
} {
  const dam = MARATHWADA_RESERVOIRS.find((d) => d.id === upstreamDamId);
  if (!dam) {
    throw new Error(`Unknown dam ID: ${upstreamDamId}`);
  }

  const effectiveRelease = Math.min(releaseTmc, Math.max(0, dam.currentLiveStorageTmc - 0.5));
  const newStorage = dam.currentLiveStorageTmc - effectiveRelease;
  const newPercent = (newStorage / dam.liveCapacityTmc) * 100;

  // Transit attenuation: ~15% evaporation & canal percolation losses
  const netReceivedMcm = effectiveRelease * 28.3168 * 0.85;

  const beneficiaries = dam.beneficiaryDistricts.map((dId, idx) => {
    // Upstream dam relieves surface water stress proportional to downstream proximity
    const factor = 1 / (idx + 1.2);
    const districtMcm = netReceivedMcm * (1 / dam.beneficiaryDistricts.length);
    const wsiRelief = Math.min(0.65, 0.08 * effectiveRelease * factor);
    return {
      districtId: dId,
      stressReliefWsi: parseFloat(wsiRelief.toFixed(3)),
      estimatedWaterAddedMcm: parseFloat(districtMcm.toFixed(2)),
    };
  });

  return {
    upstreamRemainingTmc: parseFloat(newStorage.toFixed(2)),
    upstreamNewPercent: parseFloat(newPercent.toFixed(1)),
    downstreamBeneficiaries: beneficiaries,
  };
}
