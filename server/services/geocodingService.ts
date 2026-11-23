export interface GeocodedLocation {
  query: string;
  resolvedName: string;
  latitude: number;
  longitude: number;
  country: string | null;
}

export type GeocodeResult =
  | { ok: true; location: GeocodedLocation }
  | { ok: false; reason: 'invalid_query' | 'not_found' | 'upstream_error'; message: string };

interface OpenMeteoGeocodeItem {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeItem[];
}

function parseDirectCoordinates(input: string): GeocodedLocation | null {
  const match = input.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    query: input.trim(),
    resolvedName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    latitude,
    longitude,
    country: null,
  };
}

async function fetchOpenMeteoGeocode(searchName: string): Promise<OpenMeteoGeocodeItem[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', searchName);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Geocoding service responded with status ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoGeocodeResponse;
  return Array.isArray(data.results) ? data.results : [];
}

export async function geocodeLocationName(rawQuery: string): Promise<GeocodeResult> {
  const query = rawQuery.trim().replace(/\s+/g, ' ');
  if (!query || query.length > 120) {
    return {
      ok: false,
      reason: 'invalid_query',
      message: 'Please provide a valid city or neighborhood name.',
    };
  }

  const direct = parseDirectCoordinates(query);
  if (direct) {
    return { ok: true, location: direct };
  }

  try {
    let candidates = await fetchOpenMeteoGeocode(query);

    const commaParts = query.split(',').map((part) => part.trim()).filter(Boolean);
    if (candidates.length === 0 && commaParts.length > 1) {
      candidates = await fetchOpenMeteoGeocode(commaParts[0]);
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        reason: 'not_found',
        message: `Could not find geographic coordinates for "${query}".`,
      };
    }

    let selected = candidates[0];
    if (commaParts.length > 1) {
      const countryHint = commaParts[commaParts.length - 1].toLowerCase();
      const countryMatch = candidates.find(
        (c) =>
          c.country?.toLowerCase().includes(countryHint) ||
          c.admin1?.toLowerCase().includes(countryHint)
      );
      if (countryMatch) {
        selected = countryMatch;
      }
    }

    const parts = [selected.name, selected.admin1, selected.country].filter(Boolean);
    return {
      ok: true,
      location: {
        query,
        resolvedName: parts.join(', '),
        latitude: selected.latitude,
        longitude: selected.longitude,
        country: selected.country ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'upstream_error',
      message:
        error instanceof Error
          ? `Geocoding lookup failed: ${error.message}`
          : 'Geocoding lookup failed.',
    };
  }
}
