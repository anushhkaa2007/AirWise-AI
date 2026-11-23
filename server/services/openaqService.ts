import type {
  AirQualityOverviewData,
  PollutantMeasurement,
  PollutantTrendInfo,
  PollutantTrendPoint,
} from '../../src/types/airwise.ts';
import {
  buildUnavailableOverview,
  computeAqiFromMeasurements,
  formatParameterDisplayName,
  formatReadableTimestamp,
  isTimestampExpired,
  isTimestampStale,
  normalizeParameterKey,
  rankOpenAQLocations,
  type OpenAQLocationCandidate,
  type OpenAQSensorCandidate,
} from '../../src/utils/openaqLogic.ts';
import type { GeocodedLocation } from './geocodingService.ts';

const OPENAQ_BASE_URL = 'https://api.openaq.org/v3';
const SEARCH_RADIUS_METERS = 25000;

interface OpenAQLocationsResponse {
  results?: OpenAQLocationCandidate[];
}

interface OpenAQLatestItem {
  datetime?: {
    utc?: string;
    local?: string;
  };
  value?: number;
  sensorsId?: number;
  locationsId?: number;
}

interface OpenAQLatestResponse {
  results?: OpenAQLatestItem[];
}

interface OpenAQHourItem {
  value?: number;
  period?: {
    datetimeFrom?: { utc?: string; local?: string };
    datetimeTo?: { utc?: string; local?: string };
  };
}

interface OpenAQHoursResponse {
  results?: OpenAQHourItem[];
}

export interface OpenAQFetchResult {
  httpStatus: number;
  overview: AirQualityOverviewData;
  trends: PollutantTrendInfo[];
  errorCode?:
    | 'missing_api_key'
    | 'authentication_error'
    | 'rate_limited'
    | 'upstream_error'
    | 'no_stations'
    | 'no_valid_measurements';
}

const DEFAULT_TIME_SLOTS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];

export function createEmptyPollutantTrends(
  status: 'available' | 'unavailable' = 'unavailable'
): PollutantTrendInfo[] {
  return [
    {
      pollutant: 'PM2.5',
      unit: 'µg/m³',
      status,
      description: 'Fine inhalable particulate matter (2.5 micrometers and smaller).',
      timeSlots: DEFAULT_TIME_SLOTS,
      points: [],
    },
    {
      pollutant: 'PM10',
      unit: 'µg/m³',
      status,
      description: 'Coarse inhalable particulate matter (10 micrometers and smaller).',
      timeSlots: DEFAULT_TIME_SLOTS,
      points: [],
    },
    {
      pollutant: 'NO2',
      unit: 'ppb',
      status,
      description: 'Nitrogen dioxide concentration from urban traffic and combustion.',
      timeSlots: DEFAULT_TIME_SLOTS,
      points: [],
    },
    {
      pollutant: 'O3',
      unit: 'ppb',
      status,
      description: 'Ground-level ozone levels across afternoon sunlight hours.',
      timeSlots: DEFAULT_TIME_SLOTS,
      points: [],
    },
  ];
}

async function fetchOpenAQJson<T>(
  path: string,
  apiKey: string
): Promise<{ ok: true; data: T; serverNowMs: number } | { ok: false; status: number; message: string }> {
  const response = await fetch(`${OPENAQ_BASE_URL}${path}`, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  const dateHeader = response.headers.get('date');
  const parsedServerDate = dateHeader ? Date.parse(dateHeader) : NaN;
  const serverNowMs = Number.isFinite(parsedServerDate) ? parsedServerDate : Date.now();

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      message: errorBody || `OpenAQ API error (${response.status})`,
    };
  }

  const data = (await response.json()) as T;
  return { ok: true, data, serverNowMs };
}

async function fetchSensorHourlySeries(
  sensorId: number,
  referenceNowMs: number,
  apiKey: string
): Promise<PollutantTrendPoint[]> {
  const fromIso = new Date(referenceNowMs - 24 * 60 * 60 * 1000).toISOString();
  const res = await fetchOpenAQJson<OpenAQHoursResponse>(
    `/sensors/${sensorId}/hours?datetime_from=${encodeURIComponent(fromIso)}&limit=24`,
    apiKey
  );

  if (!res.ok || !Array.isArray(res.data.results)) {
    return [];
  }

  const points: PollutantTrendPoint[] = [];
  for (const item of res.data.results) {
    const ts = item.period?.datetimeTo?.utc ?? item.period?.datetimeFrom?.utc;
    if (typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value < 0 || !ts) {
      continue;
    }
    const parsed = Date.parse(ts);
    if (!Number.isFinite(parsed)) continue;
    const d = new Date(parsed);
    const label = `${String(d.getUTCHours()).padStart(2, '0')}:00`;
    points.push({
      timestamp: ts,
      label,
      value: Number(item.value.toFixed(1)),
    });
  }

  points.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return points;
}

export async function fetchOpenAQForCoordinates(
  geocoded: GeocodedLocation
): Promise<OpenAQFetchResult> {
  const apiKey = process.env.OPENAQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      httpStatus: 503,
      errorCode: 'missing_api_key',
      trends: createEmptyPollutantTrends('unavailable'),
      overview: buildUnavailableOverview({
        location: geocoded.query,
        resolvedLocation: geocoded.resolvedName,
        coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
        reason: 'missing_api_key',
        integrationNote:
          'OPENAQ_API_KEY is not configured on the server. Configure the secret to enable live OpenAQ v3 telemetry.',
      }),
    };
  }

  const coordParam = `${geocoded.latitude.toFixed(4)},${geocoded.longitude.toFixed(4)}`;
  let locationsRes: Awaited<ReturnType<typeof fetchOpenAQJson<OpenAQLocationsResponse>>>;
  try {
    locationsRes = await fetchOpenAQJson<OpenAQLocationsResponse>(
      `/locations?coordinates=${encodeURIComponent(coordParam)}&radius=${SEARCH_RADIUS_METERS}&limit=50`,
      apiKey
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network failure';
    return {
      httpStatus: 502,
      errorCode: 'upstream_error',
      trends: createEmptyPollutantTrends('unavailable'),
      overview: buildUnavailableOverview({
        location: geocoded.query,
        resolvedLocation: geocoded.resolvedName,
        coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
        reason: 'upstream_error',
        integrationNote: `Unable to reach OpenAQ API v3 (${msg}).`,
      }),
    };
  }

  if (!locationsRes.ok) {
    if (locationsRes.status === 401 || locationsRes.status === 403) {
      return {
        httpStatus: 401,
        errorCode: 'authentication_error',
        trends: createEmptyPollutantTrends('unavailable'),
        overview: buildUnavailableOverview({
          location: geocoded.query,
          resolvedLocation: geocoded.resolvedName,
          coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
          reason: 'authentication_error',
          integrationNote:
            'OpenAQ API v3 rejected authentication. Verify OPENAQ_API_KEY on the server.',
        }),
      };
    }

    if (locationsRes.status === 429) {
      return {
        httpStatus: 429,
        errorCode: 'rate_limited',
        trends: createEmptyPollutantTrends('unavailable'),
        overview: buildUnavailableOverview({
          location: geocoded.query,
          resolvedLocation: geocoded.resolvedName,
          coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
          reason: 'rate_limited',
          integrationNote: 'OpenAQ API v3 rate limit reached. Please retry shortly.',
        }),
      };
    }

    return {
      httpStatus: 502,
      errorCode: 'upstream_error',
      trends: createEmptyPollutantTrends('unavailable'),
      overview: buildUnavailableOverview({
        location: geocoded.query,
        resolvedLocation: geocoded.resolvedName,
        coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
        reason: 'upstream_error',
        integrationNote: `OpenAQ station search failed (HTTP ${locationsRes.status}).`,
      }),
    };
  }

  const serverNowMs = locationsRes.serverNowMs;
  const rawStations = Array.isArray(locationsRes.data.results)
    ? locationsRes.data.results
    : [];

  if (rawStations.length === 0) {
    return {
      httpStatus: 200,
      errorCode: 'no_stations',
      trends: createEmptyPollutantTrends('unavailable'),
      overview: buildUnavailableOverview({
        location: geocoded.query,
        resolvedLocation: geocoded.resolvedName,
        coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
        reason: 'no_stations',
        integrationNote: `No OpenAQ monitoring stations found within ${SEARCH_RADIUS_METERS / 1000} km of ${geocoded.resolvedName}.`,
      }),
    };
  }

  const rankedStations = rankOpenAQLocations(rawStations, serverNowMs);
  const candidateLimit = Math.min(rankedStations.length, 5);

  let chosenStation: OpenAQLocationCandidate | null = null;
  let validMeasurements: PollutantMeasurement[] = [];
  let sensorByParam = new Map<string, OpenAQSensorCandidate>();

  for (let i = 0; i < candidateLimit; i += 1) {
    const candidate = rankedStations[i];
    const sensorMap = new Map<number, OpenAQSensorCandidate>();
    const paramMap = new Map<string, OpenAQSensorCandidate>();

    for (const sensor of candidate.sensors ?? []) {
      sensorMap.set(sensor.id, sensor);
      const paramKey = normalizeParameterKey(sensor.parameter?.name);
      if (paramKey && !paramMap.has(paramKey)) {
        paramMap.set(paramKey, sensor);
      }
    }

    let latestRes: Awaited<ReturnType<typeof fetchOpenAQJson<OpenAQLatestResponse>>>;
    try {
      latestRes = await fetchOpenAQJson<OpenAQLatestResponse>(
        `/locations/${candidate.id}/latest`,
        apiKey
      );
    } catch {
      continue;
    }

    if (!latestRes.ok || !Array.isArray(latestRes.data.results)) {
      if (!latestRes.ok && (latestRes.status === 401 || latestRes.status === 403)) {
        return {
          httpStatus: 401,
          errorCode: 'authentication_error',
          trends: createEmptyPollutantTrends('unavailable'),
          overview: buildUnavailableOverview({
            location: geocoded.query,
            resolvedLocation: geocoded.resolvedName,
            coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
            reason: 'authentication_error',
            integrationNote: 'OpenAQ API v3 authentication failed while reading station telemetry.',
          }),
        };
      }
      continue;
    }

    const parsedList: PollutantMeasurement[] = [];
    for (const item of latestRes.data.results) {
      if (typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value < 0) {
        continue;
      }

      const sensor = item.sensorsId !== undefined ? sensorMap.get(item.sensorsId) : undefined;
      const paramKey = normalizeParameterKey(sensor?.parameter?.name);
      if (!paramKey) continue;

      const ts = item.datetime?.utc ?? null;
      if (isTimestampExpired(ts, latestRes.serverNowMs, 168)) {
        continue;
      }

      const stale = isTimestampStale(ts, latestRes.serverNowMs, 24);
      parsedList.push({
        parameter: paramKey,
        displayName: sensor?.parameter?.displayName || formatParameterDisplayName(paramKey),
        value: Number(item.value.toFixed(1)),
        unit: sensor?.parameter?.units || 'µg/m³',
        timestamp: ts,
        isStale: stale,
      });
    }

    const hasParticulate = parsedList.some(
      (m) => m.parameter === 'pm25' || m.parameter === 'pm10'
    );

    if (parsedList.length > 0 && (hasParticulate || !chosenStation)) {
      chosenStation = candidate;
      validMeasurements = parsedList;
      sensorByParam = paramMap;
      if (hasParticulate) {
        break;
      }
    }
  }

  if (!chosenStation || validMeasurements.length === 0) {
    const nearest = rankedStations[0];
    return {
      httpStatus: 200,
      errorCode: 'no_valid_measurements',
      trends: createEmptyPollutantTrends('unavailable'),
      overview: buildUnavailableOverview({
        location: geocoded.query,
        resolvedLocation: geocoded.resolvedName,
        coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude },
        stationName: nearest?.name ?? null,
        stationId: nearest?.id ?? null,
        stationDistanceKm:
          typeof nearest?.distance === 'number'
            ? Number((nearest.distance / 1000).toFixed(1))
            : null,
        reason: 'no_valid_measurements',
        integrationNote: `Found ${rawStations.length} nearby OpenAQ station(s) around ${geocoded.resolvedName}, but none reported recent observations within the past 7 days.`,
      }),
    };
  }

  const pm25 = validMeasurements.find((m) => m.parameter === 'pm25') ?? null;
  const pm10 = validMeasurements.find((m) => m.parameter === 'pm10') ?? null;
  const aqiResult = computeAqiFromMeasurements(pm25, pm10);

  const timestamps = validMeasurements
    .map((m) => m.timestamp)
    .filter((t): t is string => Boolean(t))
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  const latestIso = timestamps[0] ?? chosenStation.datetimeLast?.utc ?? null;
  const anyStale = validMeasurements.every((m) => m.isStale);

  // Fetch hourly history safely for PM2.5, PM10, NO2, O3 sensors if present
  const trendTargets: Array<{
    pollutant: PollutantTrendInfo['pollutant'];
    paramKey: string;
    defaultUnit: string;
    description: string;
  }> = [
    {
      pollutant: 'PM2.5',
      paramKey: 'pm25',
      defaultUnit: 'µg/m³',
      description: 'Fine inhalable particulate matter (2.5 micrometers and smaller).',
    },
    {
      pollutant: 'PM10',
      paramKey: 'pm10',
      defaultUnit: 'µg/m³',
      description: 'Coarse inhalable particulate matter (10 micrometers and smaller).',
    },
    {
      pollutant: 'NO2',
      paramKey: 'no2',
      defaultUnit: 'ppb',
      description: 'Nitrogen dioxide concentration from urban traffic and combustion.',
    },
    {
      pollutant: 'O3',
      paramKey: 'o3',
      defaultUnit: 'ppb',
      description: 'Ground-level ozone levels across afternoon sunlight hours.',
    },
  ];

  const trendResults = await Promise.allSettled(
    trendTargets.map(async (target) => {
      const sensor = sensorByParam.get(target.paramKey);
      if (!sensor) {
        return {
          pollutant: target.pollutant,
          unit: target.defaultUnit,
          status: 'unavailable' as const,
          description: target.description,
          timeSlots: DEFAULT_TIME_SLOTS,
          points: [],
        };
      }
      const points = await fetchSensorHourlySeries(sensor.id, serverNowMs, apiKey);
      const unit = sensor.parameter?.units || target.defaultUnit;
      return {
        pollutant: target.pollutant,
        unit,
        status: points.length > 0 ? ('available' as const) : ('unavailable' as const),
        description: target.description,
        timeSlots: points.length > 0 ? points.map((p) => p.label) : DEFAULT_TIME_SLOTS,
        points,
      };
    })
  );

  const trends: PollutantTrendInfo[] = trendResults.map((res, idx) =>
    res.status === 'fulfilled'
      ? res.value
      : {
          pollutant: trendTargets[idx].pollutant,
          unit: trendTargets[idx].defaultUnit,
          status: 'unavailable',
          description: trendTargets[idx].description,
          timeSlots: DEFAULT_TIME_SLOTS,
          points: [],
        }
  );

  const distanceKm =
    typeof chosenStation.distance === 'number'
      ? Number((chosenStation.distance / 1000).toFixed(1))
      : null;

  const status = anyStale ? 'stale' : 'available';

  return {
    httpStatus: 200,
    trends,
    overview: {
      location: geocoded.query,
      resolvedLocation: geocoded.resolvedName,
      coordinates: chosenStation.coordinates ?? {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      },
      stationName: chosenStation.name,
      stationId: chosenStation.id,
      stationDistanceKm: distanceKm,
      status,
      aqi: aqiResult.aqi,
      aqiCategory: aqiResult.category,
      aqiPrimaryPollutant: aqiResult.primaryPollutant,
      pm25,
      pm10,
      pollutants: validMeasurements,
      aqiLabel:
        aqiResult.aqi !== null
          ? `${aqiResult.aqi} US AQI${aqiResult.category ? ` · ${aqiResult.category}` : ''}`
          : 'PM2.5/PM10 unavailable for AQI',
      pm25Label: pm25 ? `${pm25.value} ${pm25.unit}` : 'Not reported by station',
      pm10Label: pm10 ? `${pm10.value} ${pm10.unit}` : 'Not reported by station',
      dataSourceLabel: `OpenAQ API v3 · ${chosenStation.name}`,
      lastUpdatedLabel: formatReadableTimestamp(latestIso),
      lastUpdatedIso: latestIso,
      isStale: anyStale,
      integrationNote: anyStale
        ? `Displaying most recent OpenAQ observation from ${chosenStation.name} (older than 24 hours).`
        : `Live measurements from OpenAQ station "${chosenStation.name}"${distanceKm !== null ? ` (${distanceKm} km away)` : ''}.`,
    },
  };
}
