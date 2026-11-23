import type {
  AirQualityOverviewData,
  AirQualityStatus,
  AssistantResponseMeta,
  AssistantSection,
  ChatMessage,
  UserProfile,
} from '../types/airwise.ts';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeminiStructuredPayload {
  directAnswer: string;
  airQualityContext: string;
  personalizedRecommendations: string[];
  actionsForToday: string[];
  safetyCaveats: string[];
}

export interface GeminiPromptContext {
  question: string;
  profile: UserProfile;
  overview: AirQualityOverviewData | null;
  liveFetchError?: string | null;
  history?: ConversationTurn[];
}

export function buildGeminiSystemInstruction(): string {
  return [
    'You are AirWise AI, a calm, practical, and trustworthy urban air-quality assistant.',
    'Help families, children, older adults, students, commuters, and people with respiratory sensitivities make everyday air-quality decisions.',
    '',
    'ROLE & PERSONALIZATION:',
    '- Explain what actual pollutant readings (such as PM2.5, PM10, NO2, O3, SO2, CO) mean in simple everyday language.',
    '- Give practical advice tailored to the user profile (location, lifestyle, household members, preferred commute, indoor air purifier) whenever those fields are provided.',
    '- Suggest daily routines to reduce pollution exposure, proven indoor air-quality improvements (source control, kitchen exhaust, timed ventilation, wet dusting, HEPA/MERV-13 filtration), and sustainable alternatives (e.g., public transit, off-peak routes away from traffic, avoiding indoor burning) when relevant.',
    '',
    'STRICT ACCURACY RULES (MUST NEVER VIOLATE):',
    '1. NEVER invent, estimate, or extrapolate AQI values, pollutant concentrations, station names, timestamps, or forecasts.',
    '2. NEVER calculate or generate your own AQI number. Only state the exact "calculatedUsEpaAqi" and "usEpaCategory" provided in the verified context JSON if present.',
    '3. Do NOT confuse US EPA AQI with India CPCB AQI. Whenever quoting the provided AQI, explicitly label it as "US EPA AQI".',
    '4. Clearly distinguish live station observations (OpenAQ API v3), calculated US EPA AQI, and modeled forecasts (explicitly note that modeled forecasts are not connected yet).',
    '5. NEVER assume outdoor station readings represent indoor air quality; state that indoor air varies with cooking, indoor smoke, ventilation, and filtration.',
    '6. If live data is unavailable, missing, or marked stale (isStale: true), clearly explain that limitation separately and provide general safety guidance without fabricating readings.',
    '7. Do NOT make medical diagnoses or prescribe medication; advise speaking with a healthcare professional for medical symptoms or treatment.',
    '8. Avoid unsupported claims about houseplants purifying indoor air or unproven commercial air gadgets.',
    '',
    'RESPONSE STYLE & JSON FIELDS:',
    '- Keep tone conversational, concise, friendly, and easy to understand; avoid technical jargon.',
    '- Return valid JSON matching the schema with:',
    '  * directAnswer: 1-2 clear, direct sentences answering the user question.',
    '  * airQualityContext: 1-3 sentences summarizing the verified station, pollutant readings with units, timestamp, freshness, and US EPA AQI (or explaining clearly that live data is unavailable/not set).',
    '  * personalizedRecommendations: 2-4 concise, actionable recommendation bullets personalized to the user profile and question.',
    '  * actionsForToday: 2-4 concrete practical routine steps for today.',
    '  * safetyCaveats: 1-3 short caveats covering indoor-vs-outdoor air, modeled forecast status, no medical diagnosis, and any stale/missing data limitation.',
  ].join('\n');
}

export function serializeGroundingContext(ctx: GeminiPromptContext): Record<string, unknown> {
  const hasLiveData =
    Boolean(ctx.overview) &&
    (ctx.overview?.status === 'available' || ctx.overview?.status === 'stale') &&
    !ctx.liveFetchError;

  const profileSummary: Record<string, string> = {};
  if (ctx.profile.location) profileSummary.location = ctx.profile.location;
  if (ctx.profile.householdType) profileSummary.householdType = ctx.profile.householdType;
  if (ctx.profile.childrenInHousehold) {
    profileSummary.childrenInHousehold = ctx.profile.childrenInHousehold;
  }
  if (ctx.profile.seniorCitizensInHousehold) {
    profileSummary.seniorCitizensInHousehold = ctx.profile.seniorCitizensInHousehold;
  }
  if (ctx.profile.lifestyle) profileSummary.lifestyle = ctx.profile.lifestyle;
  if (ctx.profile.preferredCommute) {
    profileSummary.preferredCommute = ctx.profile.preferredCommute;
  }
  if (ctx.profile.commuteDepartureTime) {
    profileSummary.commuteDepartureTime = ctx.profile.commuteDepartureTime;
  }
  if (ctx.profile.outdoorExerciseHabit) {
    profileSummary.outdoorExerciseHabit = ctx.profile.outdoorExerciseHabit;
  }
  if (ctx.profile.indoorAirPurifier) {
    profileSummary.indoorAirPurifier = ctx.profile.indoorAirPurifier;
  }
  if (ctx.profile.ventilationPreference) {
    profileSummary.ventilationPreference = ctx.profile.ventilationPreference;
  }

  let verifiedAirQuality: Record<string, unknown>;
  if (hasLiveData && ctx.overview) {
    verifiedAirQuality = {
      status: ctx.overview.status,
      location: ctx.overview.resolvedLocation || ctx.overview.location,
      stationName: ctx.overview.stationName,
      stationDistanceKm: ctx.overview.stationDistanceKm,
      source: ctx.overview.dataSourceLabel,
      timestampUtcLabel: ctx.overview.lastUpdatedLabel,
      timestampIso: ctx.overview.lastUpdatedIso,
      isStale: ctx.overview.isStale,
      calculatedUsEpaAqi: ctx.overview.aqi,
      usEpaCategory: ctx.overview.aqiCategory,
      primaryPollutantForAqi: ctx.overview.aqiPrimaryPollutant,
      measuredPollutants: ctx.overview.pollutants.map((p) => ({
        name: p.displayName,
        value: p.value,
        unit: p.unit,
      })),
      modeledForecastsConnected: false,
    };
  } else {
    verifiedAirQuality = {
      status: ctx.liveFetchError
        ? 'error'
        : ctx.overview?.status ?? (ctx.profile.location ? 'unavailable' : 'location_required'),
      locationQueried: ctx.profile.location || null,
      limitationReason:
        ctx.liveFetchError ??
        ctx.overview?.integrationNote ??
        'No active location is selected or no recent OpenAQ station observation was found.',
      calculatedUsEpaAqi: null,
      measuredPollutants: [],
      modeledForecastsConnected: false,
    };
  }

  return {
    userProfile:
      Object.keys(profileSummary).length > 0
        ? profileSummary
        : { note: 'No profile details configured yet' },
    verifiedAirQuality,
    recentConversation: (ctx.history ?? [])
      .slice(-4)
      .map((turn) => ({
        role: turn.role,
        content: turn.content.slice(0, 400),
      })),
    currentQuestion: ctx.question.trim(),
  };
}

export function buildGeminiUserPrompt(ctx: GeminiPromptContext): string {
  const payload = serializeGroundingContext(ctx);
  return [
    'Use ONLY the verified air-quality context below (do not invent any numbers, stations, or timestamps).',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 6);
}

function serializeSections(sections: AssistantSection[], notice: string | null): string {
  const blocks: string[] = [];
  for (const section of sections) {
    const lines: string[] = [];
    if (section.heading) lines.push(section.heading);
    for (const p of section.paragraphs ?? []) lines.push(p);
    for (const b of section.bullets ?? []) lines.push(`• ${b}`);
    if (lines.length > 0) blocks.push(lines.join('\n'));
  }
  if (notice) blocks.push(notice);
  return blocks.join('\n\n');
}

export function parseGeminiStructuredResponse(
  rawText: string | undefined,
  options: {
    model: string;
    profile: UserProfile;
    overview: AirQualityOverviewData | null;
    liveFetchError?: string | null;
    timestamp: string;
  }
): ChatMessage | null {
  if (!rawText || !rawText.trim()) return null;

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed: Partial<GeminiStructuredPayload>;
  try {
    parsed = JSON.parse(cleaned) as Partial<GeminiStructuredPayload>;
  } catch {
    return null;
  }

  const directAnswer =
    typeof parsed.directAnswer === 'string' ? parsed.directAnswer.trim() : '';
  const airQualityContext =
    typeof parsed.airQualityContext === 'string' ? parsed.airQualityContext.trim() : '';
  const personalizedRecommendations = cleanStringArray(
    parsed.personalizedRecommendations
  );
  const actionsForToday = cleanStringArray(parsed.actionsForToday);
  const safetyCaveats = cleanStringArray(parsed.safetyCaveats);

  if (!directAnswer || (personalizedRecommendations.length === 0 && actionsForToday.length === 0)) {
    return null;
  }

  const hasLiveData =
    Boolean(options.overview) &&
    (options.overview?.status === 'available' || options.overview?.status === 'stale') &&
    !options.liveFetchError;

  const sections: AssistantSection[] = [
    {
      heading: 'Direct answer',
      paragraphs: [directAnswer],
    },
  ];

  if (airQualityContext) {
    sections.push({
      heading: hasLiveData ? 'Current air-quality context' : 'Live air-quality status',
      paragraphs: [airQualityContext],
    });
  }

  if (personalizedRecommendations.length > 0) {
    sections.push({
      heading: 'Personalized recommendations',
      bullets: personalizedRecommendations,
    });
  }

  if (actionsForToday.length > 0) {
    sections.push({
      heading: 'Practical actions for today',
      bullets: actionsForToday,
    });
  }

  if (safetyCaveats.length > 0) {
    sections.push({
      heading: 'Safety & data caveats',
      bullets: safetyCaveats,
    });
  }

  const attemptedLocation = options.profile.location.trim();
  const liveDataStatus: AirQualityStatus | 'error' = options.liveFetchError
    ? 'error'
    : options.overview?.status ?? (attemptedLocation ? 'unavailable' : 'location_required');

  const notice = hasLiveData && options.overview
    ? `Grounded in OpenAQ API v3 observations from ${options.overview.stationName ?? options.overview.location} (${options.overview.lastUpdatedLabel}${options.overview.isStale ? ' · Stale >24h' : ''}). Modeled forecasts are not connected yet.`
    : attemptedLocation
      ? `Location-specific OpenAQ readings for ${attemptedLocation} were unavailable for this reply, so general safety guidance is provided without live AQI numbers.`
      : 'No city is selected yet, so general air-quality guidance is provided without location-specific readings.';

  const meta: AssistantResponseMeta = {
    guidanceMode: hasLiveData ? 'gemini-live' : 'gemini-general',
    geminiUsed: true,
    model: options.model,
    geminiError: null,
    locationQueried: attemptedLocation || null,
    liveDataStatus,
    stationName: hasLiveData ? options.overview?.stationName ?? null : null,
    sourceLabel: hasLiveData ? options.overview?.dataSourceLabel ?? null : null,
    timestampLabel: hasLiveData ? options.overview?.lastUpdatedLabel ?? null : null,
    isStale: Boolean(hasLiveData && options.overview?.isStale),
    aqi: hasLiveData ? options.overview?.aqi ?? null : null,
    aqiCategory: hasLiveData ? options.overview?.aqiCategory ?? null : null,
    notice,
  };

  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: 'assistant',
    timestamp: options.timestamp,
    content: serializeSections(sections, notice),
    sections,
    meta,
  };
}
