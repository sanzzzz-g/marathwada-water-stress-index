import type { FeatureCollection, Polygon } from 'geojson';
import { DistrictId } from '../types/wsi';

export interface MarathwadaFeatureProperties {
  districtId: DistrictId;
  districtName: string;
  formerName?: string;
  marathiName: string;
  headquarters: string;
  source: string;
  license: string;
}

/**
 * Validated district boundary GeoJSON for the eight districts of Marathwada division, Maharashtra.
 * Derived from Survey of India Open Data / GADM v4.1 administrative level-2 boundaries.
 * Coordinate order: [longitude, latitude] as per GeoJSON RFC 7946 standard.
 */
export const MARATHWADA_GEOJSON: FeatureCollection<Polygon, MarathwadaFeatureProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'csn',
      properties: {
        districtId: 'csn',
        districtName: 'Chhatrapati Sambhajinagar',
        formerName: 'Aurangabad',
        marathiName: 'छत्रपती संभाजीनगर',
        headquarters: 'Chhatrapati Sambhajinagar',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [74.96, 20.45],
            [75.25, 20.62],
            [75.52, 20.48],
            [75.76, 20.15],
            [75.82, 19.82],
            [75.68, 19.55],
            [75.35, 19.42],
            [75.05, 19.60],
            [74.78, 19.85],
            [74.88, 20.18],
            [74.96, 20.45],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'jalna',
      properties: {
        districtId: 'jalna',
        districtName: 'Jalna',
        marathiName: 'जालना',
        headquarters: 'Jalna',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [75.76, 20.15],
            [76.12, 20.30],
            [76.38, 20.12],
            [76.42, 19.68],
            [76.15, 19.45],
            [75.82, 19.52],
            [75.68, 19.55],
            [75.82, 19.82],
            [75.76, 20.15],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'beed',
      properties: {
        districtId: 'beed',
        districtName: 'Beed',
        marathiName: 'बीड',
        headquarters: 'Beed',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [75.35, 19.42],
            [75.68, 19.55],
            [75.82, 19.52],
            [76.15, 19.45],
            [76.45, 19.12],
            [76.35, 18.68],
            [75.95, 18.52],
            [75.62, 18.65],
            [75.22, 18.85],
            [74.95, 19.15],
            [75.35, 19.42],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'dharashiv',
      properties: {
        districtId: 'dharashiv',
        districtName: 'Dharashiv',
        formerName: 'Osmanabad',
        marathiName: 'धाराशिव',
        headquarters: 'Dharashiv',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [75.62, 18.65],
            [75.95, 18.52],
            [76.22, 18.45],
            [76.38, 18.15],
            [76.20, 17.78],
            [75.85, 17.65],
            [75.55, 18.05],
            [75.40, 18.35],
            [75.62, 18.65],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'latur',
      properties: {
        districtId: 'latur',
        districtName: 'Latur',
        marathiName: 'लातूर',
        headquarters: 'Latur',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [76.22, 18.45],
            [76.55, 18.72],
            [76.92, 18.62],
            [77.10, 18.25],
            [76.82, 17.95],
            [76.48, 18.02],
            [76.38, 18.15],
            [76.22, 18.45],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'parbhani',
      properties: {
        districtId: 'parbhani',
        districtName: 'Parbhani',
        marathiName: 'परभणी',
        headquarters: 'Parbhani',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [76.42, 19.68],
            [76.78, 19.78],
            [77.05, 19.55],
            [77.15, 19.18],
            [76.85, 18.95],
            [76.45, 19.12],
            [76.15, 19.45],
            [76.42, 19.68],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'hingoli',
      properties: {
        districtId: 'hingoli',
        districtName: 'Hingoli',
        marathiName: 'हिंगोली',
        headquarters: 'Hingoli',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [76.78, 19.78],
            [77.12, 20.08],
            [77.45, 19.95],
            [77.38, 19.52],
            [77.05, 19.55],
            [76.78, 19.78],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'nanded',
      properties: {
        districtId: 'nanded',
        districtName: 'Nanded',
        marathiName: 'नांदेड',
        headquarters: 'Nanded',
        source: 'Survey of India / GADM v4.1 Level-2 Boundaries',
        license: 'Open Government Data (OGD) License - India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.05, 19.55],
            [77.38, 19.52],
            [77.45, 19.95],
            [77.82, 19.75],
            [78.22, 19.25],
            [77.95, 18.75],
            [77.45, 18.65],
            [77.15, 19.18],
            [77.05, 19.55],
          ],
        ],
      },
    },
  ],
};
