import type {
  AirQualityOverviewData,
  PollutantTrendInfo,
  RecommendationPlaceholder,
  UserProfile,
} from '../../src/types/airwise.ts';
import { buildUnavailableOverview } from '../../src/utils/openaqLogic.ts';
import { geocodeLocationName } from './geocodingService.ts';
import {
  createEmptyPollutantTrends,
  fetchOpenAQForCoordinates,
} from './openaqService.ts';

export interface AirQualityBundle {
  httpStatus: number;
  overview: AirQualityOverviewData;
  recommendations: RecommendationPlaceholder[];
  trends: PollutantTrendInfo[];
  errorCode?: string;
}

const RECENT_BUNDLE_TTL_MS = 20_000;
const recentBundleCache = new Map<
  string,
  { expiresAt: number; bundle: AirQualityBundle }
>();

export async function getRecentOrLiveAirQualityBundle(
  locationInput: string,
  profile: UserProfile
): Promise<AirQualityBundle> {
  const key = locationInput.trim().toLowerCase();
  if (key) {
    const cached = recentBundleCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.bundle,
        recommendations: await getRecommendationPlaceholders(
          profile,
          cached.bundle.overview
        ),
      };
    }
  }
  return getLiveAirQualityBundle(locationInput, profile);
}

export async function getLiveAirQualityBundle(
  locationInput: string,
  profile: UserProfile
): Promise<AirQualityBundle> {
  const cleanLocation = locationInput.trim();
  const recommendations = await getRecommendationPlaceholders(profile);

  if (!cleanLocation) {
    return {
      httpStatus: 200,
      overview: buildUnavailableOverview({
        location: 'No location selected',
        status: 'location_required',
        reason: 'location_required',
        dataSourceLabel: 'OpenAQ API v3',
        integrationNote:
          'Enter a city or neighborhood in the search bar to load nearby OpenAQ monitoring stations.',
      }),
      recommendations,
      trends: createEmptyPollutantTrends('unavailable'),
    };
  }

  const geocode = await geocodeLocationName(cleanLocation);
  if (!geocode.ok) {
    return {
      httpStatus: geocode.reason === 'invalid_query' ? 400 : 200,
      errorCode: geocode.reason,
      overview: buildUnavailableOverview({
        location: cleanLocation,
        reason: geocode.reason,
        dataSourceLabel: 'OpenAQ API v3',
        integrationNote: geocode.message,
      }),
      recommendations,
      trends: createEmptyPollutantTrends('unavailable'),
    };
  }

  const openaqResult = await fetchOpenAQForCoordinates(geocode.location);

  const bundle: AirQualityBundle = {
    httpStatus: openaqResult.httpStatus,
    overview: openaqResult.overview,
    recommendations: await getRecommendationPlaceholders(profile, openaqResult.overview),
    trends: openaqResult.trends,
    errorCode: openaqResult.errorCode,
  };

  if (
    bundle.overview.status === 'available' ||
    bundle.overview.status === 'stale'
  ) {
    recentBundleCache.set(cleanLocation.toLowerCase(), {
      expiresAt: Date.now() + RECENT_BUNDLE_TTL_MS,
      bundle,
    });
  }

  return bundle;
}

export async function getRecommendationPlaceholders(
  profile: UserProfile,
  overview?: AirQualityOverviewData
): Promise<RecommendationPlaceholder[]> {
  const commuteContext = profile.preferredCommute
    ? `Configured commute mode: ${profile.preferredCommute}`
    : 'Set your preferred commute in My Profile to personalize future alerts';

  const purifierContext = profile.indoorAirPurifier
    ? `Indoor purifier available: ${profile.indoorAirPurifier}`
    : 'Specify indoor purifier availability in My Profile';

  const familyMembers: string[] = [];
  if (profile.childrenInHousehold) {
    familyMembers.push(`Children: ${profile.childrenInHousehold}`);
  }
  if (profile.seniorCitizensInHousehold) {
    familyMembers.push(`Seniors: ${profile.seniorCitizensInHousehold}`);
  }
  const familyContext =
    familyMembers.length > 0
      ? `Household sensitivity profile (${familyMembers.join(' · ')})`
      : 'Add household details in My Profile for tailored family guidance';

  const statusLabel =
    overview?.status === 'available' || overview?.status === 'stale'
      ? overview.aqiCategory
        ? `AQI: ${overview.aqi} (${overview.aqiCategory})`
        : 'OpenAQ telemetry active'
      : 'Gemini guidance pending';

  return [
    {
      id: 'smart-commute',
      title: 'Smart Commute',
      subtitle: 'Transit & outdoor exposure timing',
      statusLabel,
      description:
        'Personalized route timing and exposure guidance will synthesize live OpenAQ particulate data with your commute mode once Gemini reasoning is enabled.',
      profileContextHint: commuteContext,
    },
    {
      id: 'indoor-protection',
      title: 'Indoor Air Protection',
      subtitle: 'Ventilation & filtration cadence',
      statusLabel,
      description:
        'Window ventilation windows and indoor filtration guidance will evaluate live outdoor particulate readings against your home setup in the next stage.',
      profileContextHint: purifierContext,
    },
    {
      id: 'family-safety',
      title: 'Family Safety',
      subtitle: 'Sensitive group precautions',
      statusLabel,
      description:
        'Tailored activity guidance for children and older adults will combine live station readings with Gemini reasoning in the next stage.',
      profileContextHint: familyContext,
    },
  ];
}
