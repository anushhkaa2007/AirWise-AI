import type {
  AirQualityOverviewData,
  ChatMessage,
  PlannerDataSourceSummary,
  PlannerSectionData,
  PollutantTrendInfo,
  RecommendationPlaceholder,
  UserProfile,
} from '../types/airwise.ts';

export interface OverviewResponse {
  overview: AirQualityOverviewData;
  recommendations: RecommendationPlaceholder[];
  trends: PollutantTrendInfo[];
}

export interface PlannerResponse {
  location: string;
  sourceSummary: PlannerDataSourceSummary;
  sections: PlannerSectionData[];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof data?.error === 'string'
        ? data.error
        : typeof data?.message === 'string'
          ? data.message
          : `Request failed with status ${response.status}`;
    const err = new Error(errorMessage) as Error & {
      fieldErrors?: Record<string, string>;
      payload?: unknown;
    };
    if (data?.errors && typeof data.errors === 'object') {
      err.fieldErrors = data.errors;
    }
    err.payload = data;
    throw err;
  }

  return data as T;
}

export const apiClient = {
  getProfile(): Promise<{ profile: UserProfile }> {
    return requestJson('/api/profile');
  },

  saveProfile(profile: Partial<UserProfile>): Promise<{ profile: UserProfile }> {
    return requestJson('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  updateLocation(location: string): Promise<{ profile: UserProfile }> {
    return requestJson('/api/profile/location', {
      method: 'PATCH',
      body: JSON.stringify({ location }),
    });
  },

  async getAirQuality(location?: string): Promise<OverviewResponse> {
    const clean = location?.trim();
    const url = clean
      ? `/api/air-quality?location=${encodeURIComponent(clean)}`
      : '/api/air-quality/overview';

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json().catch(() => null);

    if (data && data.overview && data.trends && data.recommendations) {
      return {
        overview: data.overview as AirQualityOverviewData,
        recommendations: data.recommendations as RecommendationPlaceholder[],
        trends: data.trends as PollutantTrendInfo[],
      };
    }

    if (!response.ok) {
      const msg =
        typeof data?.error === 'string'
          ? data.error
          : `Unable to load air quality data (${response.status})`;
      throw new Error(msg);
    }

    throw new Error('Unexpected air quality response format.');
  },

  getPlanner(options?: { location?: string; refresh?: boolean }): Promise<PlannerResponse> {
    const params = new URLSearchParams();
    if (options?.location !== undefined && options.location.trim()) {
      params.set('location', options.location.trim());
    }
    if (options?.refresh) {
      params.set('refresh', '1');
    }
    const qs = params.toString();
    return requestJson(qs ? `/api/planner?${qs}` : '/api/planner');
  },

  sendAssistantMessage(
    message: string,
    options?: {
      location?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      liveFetchFailed?: boolean;
    }
  ): Promise<{ reply: ChatMessage; airQuality: OverviewResponse | null }> {
    return requestJson('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        location: options?.location,
        history: options?.history,
        liveFetchFailed: options?.liveFetchFailed,
      }),
    });
  },
};
