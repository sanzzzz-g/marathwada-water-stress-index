import { DistrictId, DistrictInfo } from '../types/wsi';

export const MARATHWADA_DISTRICTS: Record<DistrictId, DistrictInfo> = {
  csn: {
    id: 'csn',
    name: 'Chhatrapati Sambhajinagar',
    formerName: 'Aurangabad',
    marathiName: 'छत्रपती संभाजीनगर',
    headquarters: 'Chhatrapati Sambhajinagar',
    areaSqKm: 10107,
    population2011: 3701282,
    coordinates: [19.8762, 75.3433],
    primaryReservoir: 'Jayakwadi Dam (Nath Sagar, Paithan)',
    vulnerabilityTier: 'Severe',
    baselineAridityIndex: 0.38,
  },
  jalna: {
    id: 'jalna',
    name: 'Jalna',
    marathiName: 'जालना',
    headquarters: 'Jalna',
    areaSqKm: 7718,
    population2011: 1959046,
    coordinates: [19.841, 75.8864],
    primaryReservoir: 'Ghanewadi / Lower Dudhna',
    vulnerabilityTier: 'Very High',
    baselineAridityIndex: 0.35,
  },
  beed: {
    id: 'beed',
    name: 'Beed',
    marathiName: 'बीड',
    headquarters: 'Beed',
    areaSqKm: 10693,
    population2011: 2585049,
    coordinates: [18.9891, 75.7601],
    primaryReservoir: 'Majalgaon Dam / Manjara',
    vulnerabilityTier: 'Severe',
    baselineAridityIndex: 0.32,
  },
  dharashiv: {
    id: 'dharashiv',
    name: 'Dharashiv',
    formerName: 'Osmanabad',
    marathiName: 'धाराशिव',
    headquarters: 'Dharashiv',
    areaSqKm: 7569,
    population2011: 1657576,
    coordinates: [18.1856, 76.0418],
    primaryReservoir: 'Sina Kolegaon / Terna Dam',
    vulnerabilityTier: 'Severe',
    baselineAridityIndex: 0.33,
  },
  latur: {
    id: 'latur',
    name: 'Latur',
    marathiName: 'लातूर',
    headquarters: 'Latur',
    areaSqKm: 7157,
    population2011: 2455543,
    coordinates: [18.4088, 76.5604],
    primaryReservoir: 'Dhanegaon (Manjara Project)',
    vulnerabilityTier: 'Severe',
    baselineAridityIndex: 0.34,
  },
  nanded: {
    id: 'nanded',
    name: 'Nanded',
    marathiName: 'नांदेड',
    headquarters: 'Nanded',
    areaSqKm: 10528,
    population2011: 3361292,
    coordinates: [19.1383, 77.321],
    primaryReservoir: 'Vishnupuri Dam / Upper Painganga',
    vulnerabilityTier: 'High',
    baselineAridityIndex: 0.42,
  },
  parbhani: {
    id: 'parbhani',
    name: 'Parbhani',
    marathiName: 'परभणी',
    headquarters: 'Parbhani',
    areaSqKm: 6511,
    population2011: 1836086,
    coordinates: [19.2686, 76.774],
    primaryReservoir: 'Yeldari Dam / Lower Dudhna',
    vulnerabilityTier: 'Very High',
    baselineAridityIndex: 0.37,
  },
  hingoli: {
    id: 'hingoli',
    name: 'Hingoli',
    marathiName: 'हिंगोली',
    headquarters: 'Hingoli',
    areaSqKm: 4526,
    population2011: 1177345,
    coordinates: [19.7187, 77.1494],
    primaryReservoir: 'Isapur Dam / Siddheshwar',
    vulnerabilityTier: 'High',
    baselineAridityIndex: 0.41,
  },
};

export const DISTRICT_LIST = Object.values(MARATHWADA_DISTRICTS);

export const TOTAL_REGIONAL_AREA_SQKM = DISTRICT_LIST.reduce((acc, d) => acc + d.areaSqKm, 0); // ~64,811 sq km
export const TOTAL_REGIONAL_POPULATION_2011 = DISTRICT_LIST.reduce((acc, d) => acc + d.population2011, 0); // ~18.73 million

/**
 * Normalizes user or CSV district names to canonical DistrictId
 */
export function normalizeDistrictName(rawName: string): DistrictId | null {
  if (!rawName) return null;
  const clean = rawName.trim().toLowerCase().replace(/[^a-z]/g, '');

  if (clean.includes('aurangabad') || clean.includes('sambhajinagar') || clean.includes('csn')) {
    return 'csn';
  }
  if (clean.includes('jalna')) return 'jalna';
  if (clean.includes('beed') || clean.includes('bid')) return 'beed';
  if (clean.includes('osmanabad') || clean.includes('dharashiv')) return 'dharashiv';
  if (clean.includes('latur')) return 'latur';
  if (clean.includes('nanded')) return 'nanded';
  if (clean.includes('parbhani')) return 'parbhani';
  if (clean.includes('hingoli')) return 'hingoli';

  return null;
}
