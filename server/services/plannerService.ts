import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AirQualityOverviewData,
  PlannerDataSourceSummary,
  PlannerSectionData,
  UserProfile,
} from '../../src/types/airwise.ts';
import { normalizeLocation } from '../../src/utils/airwiseLogic.ts';
import {
  buildDeterministicPlannerSections,
  buildPlannerGeminiSystemInstruction,
  buildPlannerGeminiUserPrompt,
  buildPlannerSourceSummary,
  parsePlannerGeminiResponse,
} from '../../src/utils/plannerLogic.ts';
import { getRecentOrLiveAirQualityBundle } from './airQualityService.ts';

export const PLANNER_GEMINI_MODEL = 'gemini-4-hydrogen';
export const PLANNER_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const PLANNER_GEMINI_TIMEOUT_MS = 8_000;
const PLANNER_CACHE_TTL_MS = 180_000;

export interface DailyPlannerBundle {
  location: string;
  sourceSummary: PlannerDataSourceSummary;
  sections: PlannerSectionData[];
}

interface CachedPlannerEntry {
  expiresAt: number;
  bundle: DailyPlannerBundle;
}

const plannerCache = new Map<string, CachedPlannerEntry>();

const PLANNER_WINDOW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    period: {
      type: Type.STRING,
      description: 'Exact period identifier: morning, afternoon, or evening.',
    },
    summary: {
      type: Type.STRING,
      description: '1-2 sentence overview for this time window.',
    },
    outdoorActivity: {
      type: Type.STRING,
      description: '1-2 sentence practical outdoor activity and exercise guidance.',
    },
    smartCommute: {
      type: Type.STRING,
      description: '1-2 sentence commute and transit recommendation.',
    },
    indoorVentilation: {
      type: Type.STRING,
      description: '1-2 sentence indoor ventilation and filtration advice.',
    },
    familySafety: {
      type: Type.STRING,
      description: '1-2 sentence precautions for children, older adults, and sensitive groups.',
    },
    practicalAction: {
      type: Type.STRING,
      description: '1 concise, concrete practical action the user can take during this window.',
    },
    forecastNote: {
      type: Type.STRING,
      description:
        '1 sentence explicitly stating that no modeled hourly air-quality forecast is available and current station readings do not predict future pollution.',
    },
  },
  required: [
    'period',
    'summary',
    'outdoorActivity',
    'smartCommute',
    'indoorVentilation',
    'familySafety',
    'practicalAction',
    'forecastNote',
  ],
};

const PLANNER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    windows: {
      type: Type.ARRAY,
      items: PLANNER_WINDOW_SCHEMA,
      description: 'Exactly three routine windows covering morning, afternoon, and evening.',
    },
  },
  required: ['windows'],
};

function sanitizePlannerGeminiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('permission_denied')
  ) {
    return 'Gemini authentication failed; showing verified routine guidance fallback.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return 'Gemini quota limit reached temporarily; showing verified routine guidance fallback.';
  }
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable')) {
    return 'Gemini AI is temporarily experiencing high demand (503); showing verified routine guidance fallback.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Gemini planner request timed out; showing verified routine guidance fallback.';
  }
  return 'Gemini AI is temporarily unavailable; showing verified routine guidance fallback.';
}

async function generatePlannerJsonWithTimeout(
  apiKey: string,
  model: string,
  systemInstruction: string,
  userPrompt: string
): Promise<string | undefined> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const startedAt = Date.now();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: PLANNER_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      }),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Gemini planner request timed out after ${PLANNER_GEMINI_TIMEOUT_MS / 1000}s`));
        }, PLANNER_GEMINI_TIMEOUT_MS);
      }),
    ]);

    console.log(`[Gemini Planner] ${model} responded in ${Date.now() - startedAt}ms`);
    return response.text;
  } catch (err) {
    console.error(
      `[Gemini Planner] ${model} error after ${Date.now() - startedAt}ms:`,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function buildCacheKey(
  effectiveLocation: string,
  profile: UserProfile,
  overview: AirQualityOverviewData | null,
  liveFetchError: string | null,
  geminiConfigured: boolean
): string {
  return JSON.stringify({
    loc: effectiveLocation.toLowerCase(),
    status: overview?.status ?? 'none',
    ts: overview?.lastUpdatedIso ?? null,
    aqi: overview?.aqi ?? null,
    err: Boolean(liveFetchError),
    geminiConfigured,
    profile: {
      householdType: profile.householdType,
      childrenInHousehold: profile.childrenInHousehold,
      seniorCitizensInHousehold: profile.seniorCitizensInHousehold,
      lifestyle: profile.lifestyle,
      preferredCommute: profile.preferredCommute,
      indoorAirPurifier: profile.indoorAirPurifier,
      commuteDepartureTime: profile.commuteDepartureTime ?? '',
      outdoorExerciseHabit: profile.outdoorExerciseHabit ?? '',
      ventilationPreference: profile.ventilationPreference ?? '',
    },
  });
}

export async function getDailyPlanner(
  profile: UserProfile,
  options?: { locationOverride?: string; bypassCache?: boolean }
): Promise<DailyPlannerBundle> {
  const effectiveLocation = normalizeLocation(
    options?.locationOverride ?? profile.location
  );
  const effectiveProfile: UserProfile =
    effectiveLocation !== profile.location
      ? { ...profile, location: effectiveLocation }
      : profile;

  let overview: AirQualityOverviewData | null = null;
  let liveFetchError: string | null = null;

  if (effectiveLocation) {
    try {
      const bundle = await getRecentOrLiveAirQualityBundle(
        effectiveLocation,
        effectiveProfile
      );
      overview = bundle.overview;
      if (bundle.httpStatus >= 500 && bundle.overview.status === 'unavailable') {
        liveFetchError = bundle.overview.integrationNote;
      }
    } catch (error) {
      liveFetchError =
        error instanceof Error
          ? error.message
          : 'Unable to retrieve OpenAQ station observations';
    }
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  const cacheKey = buildCacheKey(
    effectiveLocation,
    effectiveProfile,
    overview,
    liveFetchError,
    Boolean(geminiApiKey)
  );

  if (!options?.bypassCache) {
    const cached = plannerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.bundle;
    }
  }

  const ctx = {
    profile: effectiveProfile,
    overview,
    liveFetchError,
    modeledForecasts: null,
  };

  let geminiNotice: string | null = null;

  if (geminiApiKey) {
    const systemInstruction = buildPlannerGeminiSystemInstruction();
    const userPrompt = buildPlannerGeminiUserPrompt(ctx);
    const candidateModels = [PLANNER_GEMINI_MODEL, PLANNER_GEMINI_FALLBACK_MODEL];

    for (const model of candidateModels) {
      try {
        const rawText = await generatePlannerJsonWithTimeout(
          geminiApiKey,
          model,
          systemInstruction,
          userPrompt
        );
        const aiSections = parsePlannerGeminiResponse(rawText, ctx);
        if (aiSections) {
          const bundle: DailyPlannerBundle = {
            location: effectiveLocation || 'No location selected',
            sourceSummary: buildPlannerSourceSummary(ctx, {
              guidanceEngine: 'gemini',
              geminiModel: model,
              geminiNotice: null,
            }),
            sections: aiSections,
          };
          plannerCache.set(cacheKey, {
            expiresAt: Date.now() + PLANNER_CACHE_TTL_MS,
            bundle,
          });
          return bundle;
        }
        geminiNotice =
          'Gemini returned an unexpected planner format; showing verified routine guidance fallback.';
      } catch (error) {
        geminiNotice = sanitizePlannerGeminiError(error);
        const lower = (error instanceof Error ? error.message : '').toLowerCase();
        const isAuthError =
          lower.includes('401') ||
          lower.includes('403') ||
          lower.includes('api_key_invalid') ||
          lower.includes('permission_denied');
        if (isAuthError) {
          break;
        }
      }
    }
  } else {
    geminiNotice =
      'Gemini AI is not configured on the server; showing verified routine guidance fallback.';
  }

  const fallbackBundle: DailyPlannerBundle = {
    location: effectiveLocation || 'No location selected',
    sourceSummary: buildPlannerSourceSummary(ctx, {
      guidanceEngine: 'fallback',
      geminiModel: null,
      geminiNotice,
    }),
    sections: buildDeterministicPlannerSections(ctx),
  };

  // Cache fallback briefly (30s) when Gemini was configured so transient 503s recover quickly on manual refresh
  plannerCache.set(cacheKey, {
    expiresAt: Date.now() + (geminiApiKey ? 30_000 : PLANNER_CACHE_TTL_MS),
    bundle: fallbackBundle,
  });

  return fallbackBundle;
}
