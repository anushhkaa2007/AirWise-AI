import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AirQualityOverviewData,
  ChatMessage,
  PollutantTrendInfo,
  RecommendationPlaceholder,
  UserProfile,
} from '../../src/types/airwise.ts';
import { normalizeLocation } from '../../src/utils/airwiseLogic.ts';
import { buildAssistantReply } from '../../src/utils/assistantGuidanceLogic.ts';
import {
  buildGeminiSystemInstruction,
  buildGeminiUserPrompt,
  parseGeminiStructuredResponse,
  type ConversationTurn,
} from '../../src/utils/geminiPromptLogic.ts';
import { getRecentOrLiveAirQualityBundle } from './airQualityService.ts';

export const GEMINI_MODEL = 'gemini-4-hydrogen';
export const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_TIMEOUT_MS = 12_000;

export interface ProcessAssistantInput {
  question: string;
  profile: UserProfile;
  locationOverride?: string;
  history?: ConversationTurn[];
  liveFetchFailed?: boolean;
}

export interface ProcessAssistantResult {
  reply: ChatMessage;
  airQuality: {
    overview: AirQualityOverviewData;
    recommendations: RecommendationPlaceholder[];
    trends: PollutantTrendInfo[];
  } | null;
}

const ASSISTANT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    directAnswer: {
      type: Type.STRING,
      description: 'Short, friendly 1-2 sentence direct answer to the user question.',
    },
    airQualityContext: {
      type: Type.STRING,
      description:
        'Summary of verified station readings, units, timestamp, freshness, and calculated US EPA AQI, or an explicit explanation that live data is unavailable.',
    },
    personalizedRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '2 to 4 concise, practical recommendations personalized to the household profile and question.',
    },
    actionsForToday: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2 to 4 concrete daily routine steps or sustainable alternatives for today.',
    },
    safetyCaveats: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '1 to 3 brief caveats covering indoor-vs-outdoor difference, modeled forecast status, no medical diagnosis, and any stale/missing data limit.',
    },
  },
  required: [
    'directAnswer',
    'airQualityContext',
    'personalizedRecommendations',
    'actionsForToday',
    'safetyCaveats',
  ],
};

function sanitizeGeminiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('401') || lower.includes('403') || lower.includes('permission_denied')) {
    return 'Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return 'Gemini API rate limit or quota reached temporarily. Showing general guidance fallback.';
  }
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable')) {
    return 'Gemini AI is temporarily experiencing high demand (503). Showing verified readings and general safety guidance instead.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Gemini request timed out. Showing general guidance fallback.';
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return `Gemini model "${GEMINI_MODEL}" could not be reached right now. Showing general guidance fallback.`;
  }
  return 'Gemini AI is temporarily unavailable. Showing verified readings and general safety guidance instead.';
}

async function generateGeminiReplyWithTimeout(
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
          responseSchema: ASSISTANT_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      }),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000}s`));
        }, GEMINI_TIMEOUT_MS);
      }),
    ]);

    console.log(`[Gemini] ${model} responded in ${Date.now() - startedAt}ms`);
    return response.text;
  } catch (err) {
    console.error(
      `[Gemini] ${model} error after ${Date.now() - startedAt}ms:`,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function processAssistantMessage(
  input: ProcessAssistantInput
): Promise<ProcessAssistantResult> {
  const cleanQuestion = input.question.trim();
  const timestamp = new Date().toISOString();
  const effectiveLocation = normalizeLocation(
    input.locationOverride ?? input.profile.location
  );

  const effectiveProfile: UserProfile =
    effectiveLocation !== input.profile.location
      ? { ...input.profile, location: effectiveLocation }
      : input.profile;

  let overview: AirQualityOverviewData | null = null;
  let airQualityPayload: ProcessAssistantResult['airQuality'] = null;
  let liveFetchError: string | null = null;

  if (input.liveFetchFailed) {
    liveFetchError = 'Live air-quality lookup failed before answering';
  } else if (effectiveLocation) {
    try {
      const bundle = await getRecentOrLiveAirQualityBundle(
        effectiveLocation,
        effectiveProfile
      );
      overview = bundle.overview;
      airQualityPayload = {
        overview: bundle.overview,
        recommendations: bundle.recommendations,
        trends: bundle.trends,
      };
      if (bundle.httpStatus >= 500 && bundle.overview.status === 'unavailable') {
        liveFetchError = bundle.overview.integrationNote;
      }
    } catch (error) {
      liveFetchError =
        error instanceof Error
          ? error.message
          : 'Unable to retrieve live OpenAQ readings';
    }
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  let geminiErrorMessage: string | null = null;

  if (geminiApiKey) {
    const systemInstruction = buildGeminiSystemInstruction();
    const userPrompt = buildGeminiUserPrompt({
      question: cleanQuestion,
      profile: effectiveProfile,
      overview,
      liveFetchError,
      history: input.history,
    });

    const candidateModels = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
    for (const model of candidateModels) {
      try {
        const rawText = await generateGeminiReplyWithTimeout(
          geminiApiKey,
          model,
          systemInstruction,
          userPrompt
        );
        const parsedReply = parseGeminiStructuredResponse(rawText, {
          model,
          profile: effectiveProfile,
          overview,
          liveFetchError,
          timestamp,
        });

        if (parsedReply) {
          return {
            reply: parsedReply,
            airQuality: airQualityPayload,
          };
        }

        geminiErrorMessage =
          'Gemini returned an unexpected format. Showing general guidance fallback.';
      } catch (error) {
        geminiErrorMessage = sanitizeGeminiError(error);
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
    geminiErrorMessage =
      'GEMINI_API_KEY is not configured on the server. Showing general guidance fallback.';
  }

  const fallbackReply = buildAssistantReply({
    question: cleanQuestion,
    profile: effectiveProfile,
    overview,
    liveFetchError,
    timestamp,
  });

  if (fallbackReply.meta) {
    fallbackReply.meta.geminiError = geminiErrorMessage;
    fallbackReply.meta.model = null;
    if (geminiErrorMessage) {
      const cleanedBase = (fallbackReply.meta.notice ?? '').replace(
        /\s*\(Gemini AI is not enabled\)\.?/gi,
        ''
      );
      fallbackReply.meta.notice = cleanedBase
        ? `${cleanedBase} (${geminiErrorMessage})`
        : geminiErrorMessage;
    }
  }

  return {
    reply: fallbackReply,
    airQuality: airQualityPayload,
  };
}
