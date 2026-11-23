import type {
  AirQualityOverviewData,
  AirQualityStatus,
  AqiHealthCategory,
  PollutantMeasurement,
} from '../types/airwise.ts';

export interface OpenAQSensorCandidate {
  id: number;
  name?: string;
  parameter?: {
    id?: number;
    name?: string;
    units?: string;
    displayName?: string;
  };
  datetimeLast?: {
    utc?: string;
    local?: string;
  } | null;
}

export interface OpenAQLocationCandidate {
  id: number;
  name: string;
  locality?: string | null;
  country?: {
    code?: string;
    name?: string;
  } | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  isMonitor?: boolean;
  isMobile?: boolean;
  distance?: number | null;
  datetimeLast?: {
    utc?: string;
    local?: string;
  } | null;
  sensors?: OpenAQSensorCandidate[];
}

interface AqiBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400 },
  { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

const PM10_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
  { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
];

function interpolateAqi(
  concentration: number,
  breakpoints: readonly AqiBreakpoint[]
): number | null {
  if (!Number.isFinite(concentration) || concentration < 0) {
    return null;
  }

  for (const bp of breakpoints) {
    if (concentration <= bp.cHigh) {
      const clamped = Math.max(concentration, bp.cLow);
      const aqi =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (clamped - bp.cLow) +
        bp.iLow;
      return Math.round(aqi);
    }
  }

  return 500;
}

export function computePm25Aqi(pm25: number): number | null {
  const truncated = Math.floor(pm25 * 10) / 10;
  return interpolateAqi(truncated, PM25_BREAKPOINTS);
}

export function computePm10Aqi(pm10: number): number | null {
  const truncated = Math.floor(pm10);
  return interpolateAqi(truncated, PM10_BREAKPOINTS);
}

export function getAqiHealthCategory(aqi: number): AqiHealthCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function computeAqiFromMeasurements(
  pm25: PollutantMeasurement | null,
  pm10: PollutantMeasurement | null
): { aqi: number | null; primaryPollutant: string | null; category: AqiHealthCategory | null } {
  const candidates: Array<{ aqi: number; label: string }> = [];

  if (pm25 && Number.isFinite(pm25.value) && pm25.value >= 0) {
    const val = computePm25Aqi(pm25.value);
    if (val !== null) candidates.push({ aqi: val, label: 'PM2.5' });
  }

  if (pm10 && Number.isFinite(pm10.value) && pm10.value >= 0) {
    const val = computePm10Aqi(pm10.value);
    if (val !== null) candidates.push({ aqi: val, label: 'PM10' });
  }

  if (candidates.length === 0) {
    return { aqi: null, primaryPollutant: null, category: null };
  }

  candidates.sort((a, b) => b.aqi - a.aqi);
  const top = candidates[0];
  return {
    aqi: top.aqi,
    primaryPollutant: top.label,
    category: getAqiHealthCategory(top.aqi),
  };
}

export function getTimestampAgeHours(
  isoTimestamp: string | null | undefined,
  nowMs: number = Date.now()
): number | null {
  if (!isoTimestamp) return null;
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) return null;
  const diffMs = Math.max(0, nowMs - parsed);
  return diffMs / (1000 * 60 * 60);
}

export function isTimestampStale(
  isoTimestamp: string | null | undefined,
  nowMs: number = Date.now(),
  staleAfterHours: number = 24
): boolean {
  const ageHours = getTimestampAgeHours(isoTimestamp, nowMs);
  if (ageHours === null) return true;
  return ageHours > staleAfterHours;
}

export function isTimestampExpired(
  isoTimestamp: string | null | undefined,
  nowMs: number = Date.now(),
  maxAgeHours: number = 168
): boolean {
  const ageHours = getTimestampAgeHours(isoTimestamp, nowMs);
  if (ageHours === null) return true;
  return ageHours > maxAgeHours;
}

export function normalizeParameterKey(raw: string | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function formatParameterDisplayName(parameterKey: string): string {
  switch (parameterKey) {
    case 'pm25':
      return 'PM2.5';
    case 'pm10':
      return 'PM10';
    case 'no2':
      return 'NO2';
    case 'o3':
      return 'O3';
    case 'so2':
      return 'SO2';
    case 'co':
      return 'CO';
    default:
      return parameterKey.toUpperCase();
  }
}

export function rankOpenAQLocations(
  locations: OpenAQLocationCandidate[],
  nowMs: number = Date.now()
): OpenAQLocationCandidate[] {
  return [...locations]
    .map((loc) => {
      const sensors = loc.sensors ?? [];
      const sensorKeys = new Set(
        sensors.map((s) => normalizeParameterKey(s.parameter?.name))
      );

      const hasPm25 = sensorKeys.has('pm25');
      const hasPm10 = sensorKeys.has('pm10');

      const latestUtc = loc.datetimeLast?.utc ?? null;
      const ageHours = getTimestampAgeHours(latestUtc, nowMs);

      let score = 0;
      if (hasPm25) score += 120;
      if (hasPm10) score += 70;
      if (hasPm25 && hasPm10) score += 60;

      if (ageHours !== null) {
        if (ageHours <= 6) score += 140;
        else if (ageHours <= 24) score += 110;
        else if (ageHours <= 72) score += 70;
        else if (ageHours <= 168) score += 30;
        else score -= 120;
      } else {
        score -= 100;
      }

      if (!loc.isMobile) {
        score += 20;
      }

      const distanceMeters =
        typeof loc.distance === 'number' && Number.isFinite(loc.distance)
          ? loc.distance
          : 25000;
      score -= Math.min(distanceMeters / 1000, 30);

      return { loc, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.loc);
}

export function formatReadableTimestamp(isoTimestamp: string | null): string {
  if (!isoTimestamp) return 'Unavailable';
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) return 'Unavailable';
  return new Date(parsed).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function buildUnavailableOverview(options: {
  location: string;
  resolvedLocation?: string | null;
  coordinates?: { latitude: number; longitude: number } | null;
  stationName?: string | null;
  stationId?: number | null;
  stationDistanceKm?: number | null;
  status?: AirQualityStatus;
  reason?: string;
  dataSourceLabel?: string;
  integrationNote: string;
}): AirQualityOverviewData {
  return {
    location: options.location || 'No location selected',
    resolvedLocation: options.resolvedLocation ?? null,
    coordinates: options.coordinates ?? null,
    stationName: options.stationName ?? null,
    stationId: options.stationId ?? null,
    stationDistanceKm: options.stationDistanceKm ?? null,
    status: options.status ?? 'unavailable',
    reason: options.reason,
    aqi: null,
    aqiCategory: null,
    aqiPrimaryPollutant: null,
    pm25: null,
    pm10: null,
    pollutants: [],
    aqiLabel: 'Unavailable',
    pm25Label: 'Unavailable',
    pm10Label: 'Unavailable',
    dataSourceLabel: options.dataSourceLabel ?? 'OpenAQ API v3',
    lastUpdatedLabel: 'Unavailable',
    lastUpdatedIso: null,
    isStale: false,
    integrationNote: options.integrationNote,
  };
}
