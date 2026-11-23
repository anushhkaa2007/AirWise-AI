import type {
  AirQualityOverviewData,
  AirQualityStatus,
  PlannerCardData,
  PlannerDataSourceSummary,
  PlannerGuidanceKind,
  PlannerSectionData,
  PlannerTimeOfDay,
  UserProfile,
} from '../types/airwise.ts';

export interface ModeledForecastWindow {
  period: PlannerTimeOfDay;
  sourceLabel: string;
  summary: string;
  estimatedAqiRange?: string;
}

export interface PlannerBuildContext {
  profile: UserProfile;
  overview: AirQualityOverviewData | null;
  liveFetchError?: string | null;
  modeledForecasts?: Partial<Record<PlannerTimeOfDay, ModeledForecastWindow>> | null;
}

export interface GeminiPlannerWindowPayload {
  period: PlannerTimeOfDay;
  summary: string;
  outdoorActivity: string;
  smartCommute: string;
  indoorVentilation: string;
  familySafety: string;
  practicalAction: string;
  forecastNote: string;
}

export interface GeminiPlannerResponsePayload {
  windows: GeminiPlannerWindowPayload[];
}

export const PLANNER_WINDOWS: ReadonlyArray<{
  period: PlannerTimeOfDay;
  label: string;
  timeWindow: string;
}> = [
  { period: 'morning', label: 'Morning', timeWindow: '06:00 – 11:30' },
  { period: 'afternoon', label: 'Afternoon', timeWindow: '11:30 – 17:00' },
  { period: 'evening', label: 'Evening', timeWindow: '17:00 – 22:00' },
];

type SeverityBand = 'unknown' | 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'severe';

function getSeverityBand(overview: AirQualityOverviewData | null): SeverityBand {
  if (!overview || (overview.status !== 'available' && overview.status !== 'stale')) {
    return 'unknown';
  }
  const aqi = overview.aqi;
  if (aqi === null) return 'unknown';
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'sensitive';
  if (aqi <= 200) return 'unhealthy';
  return 'severe';
}

function parsePositiveInt(raw: string | undefined): number {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function parseDepartureHour(raw: string | undefined): number | null {
  const trimmed = String(raw ?? '').trim();
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) + Number(match[2]) / 60;
}

function getDepartureWindow(hour: number | null): PlannerTimeOfDay | null {
  if (hour === null) return null;
  if (hour >= 5 && hour < 11.5) return 'morning';
  if (hour >= 11.5 && hour < 17) return 'afternoon';
  return 'evening';
}

function describeStationBaseline(overview: AirQualityOverviewData | null, liveFetchError?: string | null): {
  hasObservation: boolean;
  isStale: boolean;
  basisKind: PlannerGuidanceKind;
  observationPhrase: string;
} {
  if (liveFetchError || !overview || (overview.status !== 'available' && overview.status !== 'stale')) {
    return {
      hasObservation: false,
      isStale: false,
      basisKind: 'General Guidance',
      observationPhrase: 'verified live readings are unavailable',
    };
  }

  const isStale = overview.status === 'stale' || overview.isStale;
  const station = overview.stationName ?? 'the nearest OpenAQ station';
  const aqiPart =
    overview.aqi !== null && overview.aqiCategory
      ? `${overview.aqi} US EPA AQI (${overview.aqiCategory})`
      : overview.pm25
        ? `PM2.5 ${overview.pm25.value} ${overview.pm25.unit}`
        : 'station observations';

  return {
    hasObservation: true,
    isStale,
    basisKind: isStale ? 'Stale Observation' : 'Live Observation',
    observationPhrase: `${aqiPart} at ${station} (${overview.lastUpdatedLabel}${isStale ? ', over 24h old' : ''})`,
  };
}

export function buildPlannerSourceSummary(
  ctx: PlannerBuildContext,
  options: {
    guidanceEngine: 'gemini' | 'fallback';
    geminiModel?: string | null;
    geminiNotice?: string | null;
  }
): PlannerDataSourceSummary {
  const hasForecast = Boolean(
    ctx.modeledForecasts && Object.keys(ctx.modeledForecasts).length > 0
  );
  const attemptedLocation = ctx.profile.location.trim();
  const overview = ctx.overview;
  const hasLive =
    !ctx.liveFetchError &&
    Boolean(overview) &&
    (overview?.status === 'available' || overview?.status === 'stale');

  const liveDataStatus: AirQualityStatus | 'error' = ctx.liveFetchError
    ? 'error'
    : overview?.status ?? (attemptedLocation ? 'unavailable' : 'location_required');

  let limitationNote: string | null = null;
  if (ctx.liveFetchError) {
    limitationNote = `Could not verify OpenAQ readings (${ctx.liveFetchError}). Showing general air-quality routine guidance without fabricated numbers.`;
  } else if (!attemptedLocation) {
    limitationNote =
      'No city is currently set. Search a city in the top bar to pair OpenAQ station observations with your daily schedule.';
  } else if (!hasLive) {
    limitationNote =
      overview?.integrationNote ??
      `No current OpenAQ station observation was available for ${attemptedLocation}. Showing general air-quality routine guidance.`;
  } else if (overview?.isStale) {
    limitationNote = `Latest OpenAQ observation (${overview.lastUpdatedLabel}) is older than 24 hours; verify local haze before prolonged outdoor routines.`;
  }

  return {
    location: attemptedLocation || 'No location selected',
    resolvedLocation: overview?.resolvedLocation ?? null,
    liveDataStatus,
    stationName: hasLive ? overview?.stationName ?? null : null,
    stationDistanceKm: hasLive ? overview?.stationDistanceKm ?? null : null,
    dataSourceLabel: hasLive
      ? overview?.dataSourceLabel ?? 'OpenAQ API v3'
      : 'General Safety Guidance (no active station feed)',
    lastUpdatedLabel: hasLive ? overview?.lastUpdatedLabel ?? 'Unavailable' : 'Unavailable',
    lastUpdatedIso: hasLive ? overview?.lastUpdatedIso ?? null : null,
    isStale: Boolean(hasLive && overview?.isStale),
    aqi: hasLive ? overview?.aqi ?? null : null,
    aqiCategory: hasLive ? overview?.aqiCategory ?? null : null,
    aqiPrimaryPollutant: hasLive ? overview?.aqiPrimaryPollutant ?? null : null,
    pm25Label: hasLive ? overview?.pm25Label ?? 'Not reported' : 'Unavailable',
    pm10Label: hasLive ? overview?.pm10Label ?? 'Not reported' : 'Unavailable',
    forecastAvailable: hasForecast,
    forecastSourceLabel: hasForecast
      ? 'Modeled Hourly Air-Quality Forecast'
      : 'Unavailable (no hourly air-quality forecast connected)',
    guidanceEngine: options.guidanceEngine,
    geminiModel: options.geminiModel ?? null,
    geminiNotice: options.geminiNotice ?? null,
    limitationNote,
  };
}

function buildCommuteText(
  period: PlannerTimeOfDay,
  band: SeverityBand,
  profile: UserProfile,
  obs: ReturnType<typeof describeStationBaseline>
): { text: string; context: string } {
  const mode = profile.preferredCommute;
  const departureTime = profile.commuteDepartureTime?.trim() || '';
  const departureHour = parseDepartureHour(departureTime);
  const departureWindow = getDepartureWindow(departureHour);
  const isDepartureHere = departureWindow === period;
  const timeTag =
    isDepartureHere && departureTime
      ? `Scheduled ${departureTime} departure`
      : mode
        ? `Mode: ${mode}`
        : 'Default commuter guidance';

  const modeLead = mode
    ? isDepartureHere && departureTime
      ? `For your ${departureTime} ${mode.toLowerCase()} commute, `
      : `With ${mode.toLowerCase()} travel, `
    : 'For daily trips during this window, ';

  if (period === 'morning') {
    if (band === 'unhealthy' || band === 'severe' || band === 'sensitive') {
      const highExposureMode =
        mode === 'Walking' || mode === 'Bicycle' || mode === 'Two-wheeler' || !mode;
      const modeAdvice = highExposureMode
        ? 'switch to enclosed transit (metro or AC bus) if feasible, or wear a snug N95/KN95 mask and stay off congested main roads.'
        : mode === 'Car'
          ? 'keep windows closed and switch cabin ventilation to recirculate during stop-and-go morning traffic.'
          : 'wait in sheltered spots away from idling buses and wear a snug N95/KN95 mask on crowded platforms.';
      return {
        text: `${modeLead}morning boundary-layer air often traps exhaust near street level, and current baseline readings show ${obs.observationPhrase}. ${modeAdvice.charAt(0).toUpperCase() + modeAdvice.slice(1)}`,
        context: timeTag,
      };
    }
    return {
      text: `${modeLead}morning rush-hour traffic elevates roadside NO2 and resuspended dust even when neighborhood averages look manageable. Leaving 30 minutes outside peak school/office traffic or choosing quieter parallel lanes reduces tailpipe exposure.`,
      context: timeTag,
    };
  }

  if (period === 'afternoon') {
    if (band === 'unhealthy' || band === 'severe' || band === 'sensitive') {
      return {
        text: `${modeLead}keep midday errands brief, use recirculated cabin air or enclosed transit where possible, and carry a well-fitted N95/KN95 mask if walking or riding along busy corridors.`,
        context: timeTag,
      };
    }
    return {
      text: `${modeLead}midday mixing typically dilutes morning traffic plumes, making this a lower-exposure window for routine errands; still avoid lingering behind diesel vehicles at intersections and note that sunny afternoons can elevate ozone.`,
      context: timeTag,
    };
  }

  // evening
  if (band === 'unhealthy' || band === 'severe' || band === 'sensitive') {
    return {
      text: `${modeLead}cooling evening air combined with return traffic frequently concentrates PM2.5 close to breathing height. Prefer enclosed transit or recirculated AC, wear a well-sealed N95/KN95 mask outdoors, and limit waiting by roadside junctions.`,
      context: timeTag,
    };
  }
  return {
    text: `${modeLead}plan return trips before late-evening traffic slows and ground cooling begins trapping soot and dust. Wearing a snug N95/KN95 mask on two-wheelers or walks along arterial roads helps cut peak exhaust intake.`,
    context: timeTag,
  };
}

function buildOutdoorText(
  period: PlannerTimeOfDay,
  band: SeverityBand,
  profile: UserProfile,
  obs: ReturnType<typeof describeStationBaseline>
): { text: string; context: string } {
  const habit = profile.outdoorExerciseHabit || '';
  const habitContext = habit || 'Default activity pacing';

  if (period === 'morning') {
    if (band === 'unhealthy' || band === 'severe') {
      return {
        text: `Based on ${obs.observationPhrase}, skip vigorous outdoor runs or sports this morning and move stretching or cardio indoors until station particulates drop.`,
        context: habitContext,
      };
    }
    if (band === 'sensitive') {
      const exerciseAdjust =
        habit === 'Morning outdoor exercise'
          ? 'Shift your morning workout indoors or replace intense cardio with low-exertion indoor mobility.'
          : 'Keep morning outdoor walks short and move brisk exercise indoors or to a cleaner midday break.';
      return {
        text: `Current station data indicates ${obs.observationPhrase}. ${exerciseAdjust}`,
        context: habitContext,
      };
    }
    if (band === 'good') {
      return {
        text: `Current baseline readings show ${obs.observationPhrase}. Light to moderate morning outdoor walks are generally comfortable away from main roads, though watch for early-morning haze if cool air settles.`,
        context: habitContext,
      };
    }
    return {
      text: `Early morning (06:00–09:00) often holds overnight smoke and cool-air particulates close to the ground. If you exercise in the morning, favor quieter parks after mid-morning sunlight warms the air or keep high-intensity workouts indoors.`,
      context: habitContext,
    };
  }

  if (period === 'afternoon') {
    if (band === 'unhealthy' || band === 'severe') {
      return {
        text: `Current observations indicate ${obs.observationPhrase}; keep vigorous afternoon sports indoors and limit outdoor errands to brief, low-exertion trips.`,
        context: habitContext,
      };
    }
    if (band === 'sensitive') {
      return {
        text: `Midday warmth often helps disperse trapped morning smog, though baseline observations stand at ${obs.observationPhrase}. Keep outdoor exercise moderate, shorten duration, and stop if coughing or throat irritation starts.`,
        context: habitContext,
      };
    }
    return {
      text: `Afternoon hours (11:30–17:00) usually offer better atmospheric dispersion than dawn or dusk, making them a practical default window for light outdoor breaks—avoid heavy exertion next to traffic or during visible afternoon haze.`,
      context: habitContext,
    };
  }

  // evening
  if (band === 'unhealthy' || band === 'severe' || band === 'sensitive') {
    return {
      text: `Evening temperatures drop and wind often slows, increasing particle buildup after sunset. Postpone evening outdoor runs or field sports and switch to indoor workouts instead.`,
      context: habitContext,
    };
  }
  return {
    text: `Evening workouts after sunset face rising traffic fumes and surface cooling inversions. Favor indoor exercise on hazy evenings, or stick to light walks well back from busy roads before peak dusk traffic.`,
    context: habitContext,
  };
}

function buildVentilationText(
  period: PlannerTimeOfDay,
  band: SeverityBand,
  profile: UserProfile,
  obs: ReturnType<typeof describeStationBaseline>
): { text: string; context: string } {
  const hasPurifier = profile.indoorAirPurifier === 'Yes';
  const noPurifier = profile.indoorAirPurifier === 'No';
  const ventPref = profile.ventilationPreference || '';

  const contextParts: string[] = [];
  if (hasPurifier) contextParts.push('Purifier: Yes');
  else if (noPurifier) contextParts.push('Purifier: No');
  else contextParts.push('Standard home setup');
  if (ventPref) contextParts.push(ventPref);
  const context = contextParts.join(' · ');

  const purifierStep = hasPurifier
    ? 'Run your HEPA air purifier on medium in occupied rooms with exterior windows shut.'
    : noPurifier
      ? 'Keep dusty gaps sealed and use a kitchen exhaust hood or wet-mopping to curb indoor particle buildup.'
      : 'If you use a HEPA air purifier, run it in main living rooms with windows closed; otherwise focus on sealing dusty drafts and running kitchen exhaust.';

  if (period === 'morning') {
    if (band === 'good' && ventPref !== 'Keep windows closed during smog/traffic') {
      return {
        text: `With ${obs.observationPhrase}, a brief 10–15 minute cross-ventilation away from traffic roads can refresh overnight indoor air, then close roadside windows before rush hour peaks. Remember outdoor sensors do not measure indoor cooking or dust.`,
        context,
      };
    }
    return {
      text: `Keep exterior windows closed during morning traffic and cool-air haze so street PM2.5 does not drift inside. ${purifierStep} Switch on kitchen exhaust whenever preparing breakfast.`,
      context,
    };
  }

  if (period === 'afternoon') {
    if (band === 'good' || band === 'moderate') {
      return {
        text: `Midday is typically the safest time to briefly open courtyard-facing windows for 15–20 minutes of cross-ventilation if outdoor visibility looks clear and traffic is light. Keep cooking exhaust running during lunch prep.`,
        context,
      };
    }
    return {
      text: `Because outdoor baseline levels are elevated (${obs.observationPhrase}), keep windows closed through the afternoon unless outdoor haze visibly clears, and maintain indoor circulation cleanly. ${purifierStep}`,
      context,
    };
  }

  // evening
  return {
    text: `Close exterior windows before dusk traffic and evening cooking/biomass smoke settle near ground level. Run kitchen exhaust during dinner cooking, avoid incense or candles, and ${hasPurifier ? 'run your HEPA purifier in bedrooms on a quiet setting before sleep.' : 'keep bedroom doors shut after damp-dusting surfaces to help sleeping spaces stay calmer overnight.'}`,
    context,
  };
}

function buildFamilyText(
  period: PlannerTimeOfDay,
  band: SeverityBand,
  profile: UserProfile
): { text: string; context: string } {
  const kids = parsePositiveInt(profile.childrenInHousehold);
  const seniors = parsePositiveInt(profile.seniorCitizensInHousehold);

  const familyTags: string[] = [];
  if (kids > 0) familyTags.push(`${kids} child${kids > 1 ? 'ren' : ''}`);
  if (seniors > 0) familyTags.push(`${seniors} senior${seniors > 1 ? 's' : ''}`);
  const context =
    familyTags.length > 0
      ? `Household: ${familyTags.join(', ')}`
      : 'General family & sensitive-group care';

  const highRisk = band === 'sensitive' || band === 'unhealthy' || band === 'severe';

  if (period === 'morning') {
    if (kids > 0 && seniors > 0) {
      return {
        text: highRisk
          ? `Delay outdoor walks for seniors and keep school drop-offs quick with well-fitted masks; move children's active play indoors and keep prescribed inhalers accessible.`
          : `Avoid early dawn walks for seniors when cool air traps fumes; give children a brief, well-hydrated start indoors and watch for coughing along dusty school routes.`,
        context,
      };
    }
    if (kids > 0) {
      return {
        text: highRisk
          ? `Minimize children's time waiting near traffic during morning drop-off, avoid outdoor recess sprints, and check for wheezing or unusual fatigue.`
          : `During school travel, walk on shaded side streets away from idling vehicles and encourage children to wash hands and faces after arriving indoors.`,
        context,
      };
    }
    if (seniors > 0) {
      return {
        text: highRisk
          ? `Older adults and anyone with asthma, COPD, or heart conditions should skip morning outdoor walks today, stay indoors with clean air, and keep regular medications on hand.`
          : `Older adults should avoid brisk walks right at dawn when cold air concentrates soot near the ground; stretch indoors and wait for clearer mid-morning or midday hours.`,
        context,
      };
    }
    return {
      text: highRisk
        ? `Children, older adults, and people with respiratory sensitivities should stay indoors for strenuous morning tasks and wear a snug N95/KN95 mask for unavoidable trips.`
        : `Protect sensitive family members by avoiding dawn roadside exercise, keeping prescribed inhalers ready, and buffering indoor spaces from morning traffic exhaust.`,
      context,
    };
  }

  if (period === 'afternoon') {
    return {
      text: highRisk
        ? `Keep children's afternoon play indoors or strictly brief in low-traffic areas, ensure older adults remain hydrated in filtered indoor rooms, and consult a doctor promptly if breathing feels tight.`
        : `If air feels visibly clear away from main roads, brief supervised play for children or a gentle walk for seniors is reasonable; avoid playgrounds directly beside busy highways.`,
      context,
    };
  }

  // evening
  return {
    text: highRisk
      ? `Bring children indoors before dusk haze builds, skip evening outdoor strolls for older adults, and prepare closed, low-dust bedrooms for restful breathing overnight.`
      : `Transition children's active play indoors as twilight traffic peaks, keep seniors comfortable indoors during evening cooking hours, and settle bedrooms with windows shut before sleep.`,
    context,
  };
}

function buildPracticalAction(
  period: PlannerTimeOfDay,
  band: SeverityBand,
  profile: UserProfile
): string {
  const highRisk = band === 'sensitive' || band === 'unhealthy' || band === 'severe';
  const hasPurifier = profile.indoorAirPurifier === 'Yes';

  if (period === 'morning') {
    if (highRisk) {
      return 'Pack a well-fitting N95/KN95 mask before leaving home, switch cabin AC to recirculate or pick enclosed transit, and keep bedroom windows closed until midday.';
    }
    return 'Leave 20–30 minutes outside peak school/office traffic if possible, and run your kitchen exhaust fan while preparing breakfast.';
  }

  if (period === 'afternoon') {
    if (highRisk) {
      return hasPurifier
        ? 'Run your HEPA purifier on medium in your main family room and wet-wipe dusty surfaces instead of dry sweeping.'
        : 'Keep exterior windows sealed against traffic dust, run kitchen exhaust during lunch cooking, and move afternoon workouts indoors.';
    }
    return 'Open courtyard-facing windows for 15 minutes only if outdoor visibility looks clear and traffic is light, then close up before evening rush hour.';
  }

  // evening
  if (hasPurifier) {
    return 'Close all exterior windows before 17:30, run your HEPA air purifier in sleeping rooms for 1–2 hours before bedtime, and skip incense or candles.';
  }
  return 'Shut exterior windows before dusk traffic peaks, run kitchen exhaust while cooking dinner, and damp-dust sleeping rooms to keep overnight air calmer.';
}

export function buildDeterministicPlannerSections(
  ctx: PlannerBuildContext
): PlannerSectionData[] {
  const band = getSeverityBand(ctx.overview);
  const obs = describeStationBaseline(ctx.overview, ctx.liveFetchError);

  return PLANNER_WINDOWS.map(({ period, label, timeWindow }) => {
    const modeledForecast = ctx.modeledForecasts?.[period] ?? null;
    const outdoor = buildOutdoorText(period, band, ctx.profile, obs);
    const commute = buildCommuteText(period, band, ctx.profile, obs);
    const ventilation = buildVentilationText(period, band, ctx.profile, obs);
    const family = buildFamilyText(period, band, ctx.profile);
    const practicalAction = buildPracticalAction(period, band, ctx.profile);

    const dataBasisLabel = modeledForecast
      ? obs.hasObservation
        ? `${obs.basisKind} + Modeled Forecast`
        : 'Modeled Forecast'
      : obs.hasObservation
        ? `${obs.basisKind} + General Window Guidance`
        : 'General Safety Guidance';

    const forecastBasisLabel = modeledForecast ? 'Modeled Forecast' : 'Forecast Unavailable';
    const forecastNote = modeledForecast
      ? `Modeled forecast (${modeledForecast.sourceLabel}): ${modeledForecast.summary}`
      : 'Hourly air-quality forecast is unavailable (not connected yet). Guidance for this time window combines general diurnal air-quality patterns with verified station context rather than predicting future readings.';

    let summary = '';
    if (period === 'morning') {
      summary = obs.hasObservation
        ? `Morning routine anchored to ${obs.observationPhrase}; factor in dawn traffic and cool-air dispersion limits.`
        : 'Morning general routine guidance: manage rush-hour traffic exposure and early-day cool-air particulate buildup.';
    } else if (period === 'afternoon') {
      summary = obs.hasObservation
        ? `Afternoon planning combines general midday dispersion guidance with current station baseline (${obs.observationPhrase}).`
        : 'Afternoon general routine guidance: use warmer midday hours carefully for errands and short, low-traffic ventilation.';
    } else {
      summary = obs.hasObservation
        ? `Evening planning pairs return-commute and overnight recovery steps with verified station baseline (${obs.observationPhrase}).`
        : 'Evening general routine guidance: lower return-commute exposure and protect indoor sleeping spaces as air cools.';
    }

    const cardBasisKind: PlannerGuidanceKind = modeledForecast
      ? 'Modeled Forecast'
      : 'General Guidance';

    const cards: PlannerCardData[] = [
      {
        id: `${period}-outdoor`,
        period,
        title: 'Outdoor Activity & Exercise',
        category: 'Outdoor Activity',
        basisLabel: cardBasisKind,
        description: outdoor.text,
        personalizationContext: outdoor.context,
      },
      {
        id: `${period}-commute`,
        period,
        title: 'Commute & Transit Timing',
        category: 'Smart Commute',
        basisLabel: cardBasisKind,
        description: commute.text,
        personalizationContext: commute.context,
      },
      {
        id: `${period}-ventilation`,
        period,
        title: 'Ventilation & Indoor Air',
        category: 'Indoor Ventilation',
        basisLabel: cardBasisKind,
        description: ventilation.text,
        personalizationContext: ventilation.context,
      },
      {
        id: `${period}-family`,
        period,
        title: 'Children & Senior Safety',
        category: 'Family Safety',
        basisLabel: cardBasisKind,
        description: family.text,
        personalizationContext: family.context,
      },
    ];

    return {
      period,
      label,
      timeWindow,
      summary,
      dataBasisLabel,
      forecastBasisLabel,
      forecastNote,
      practicalAction,
      cards,
    };
  });
}

export function buildPlannerGeminiSystemInstruction(): string {
  return [
    'You are AirWise AI generating a structured Daily Air-Quality Routine Planner with three windows: morning (06:00-11:30), afternoon (11:30-17:00), and evening (17:00-22:00).',
    '',
    'STRICT ACCURACY RULES (MUST NEVER VIOLATE):',
    '1. NEVER invent, estimate, or extrapolate AQI values, pollutant concentrations, station names, timestamps, or future hourly forecasts.',
    '2. NEVER pretend current station readings predict afternoon or evening pollution, and NEVER write that afternoon or evening air quality "continues at" or "remains consistent with" the current AQI. Because modeledForecastAvailable is false, clearly state in summary and forecastNote that later windows combine general diurnal guidance with the latest observed station baseline rather than predicting future readings.',
    '3. ONLY cite calculatedUsEpaAqi and usEpaCategory if present in verifiedAirQuality, and explicitly label it as "US EPA AQI" (never confuse with India CPCB AQI).',
    '4. NEVER assume outdoor station readings represent indoor air quality.',
    '5. If live readings are unavailable or stale (isStale: true), mention that limitation honestly without inventing numbers.',
    '6. Do NOT make medical diagnoses or unsupported houseplant/commercial gadget claims.',
    '7. NEVER output placeholder strings like "Waiting for live data", "Reserved for...", "Gemini slot", or "preferences not set". If profile fields are missing, give clear, useful default recommendations tailored to urban households (do not assume the household owns an air purifier if indoorAirPurifier is not "Yes").',
    '',
    'PERSONALIZATION:',
    '- Tailor advice to childrenInHousehold, seniorCitizensInHousehold, preferredCommute, commuteDepartureTime, outdoorExerciseHabit, indoorAirPurifier, ventilationPreference, lifestyle, and householdType whenever provided.',
    '- Each window must give crisp, actionable, friendly 1-2 sentence entries for summary, outdoorActivity, smartCommute, indoorVentilation, familySafety, practicalAction, and forecastNote.',
  ].join('\n');
}

export function buildPlannerGeminiUserPrompt(ctx: PlannerBuildContext): string {
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
  if (ctx.profile.preferredCommute) profileSummary.preferredCommute = ctx.profile.preferredCommute;
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

  const verifiedAirQuality =
    hasLiveData && ctx.overview
      ? {
          status: ctx.overview.status,
          location: ctx.overview.resolvedLocation || ctx.overview.location,
          stationName: ctx.overview.stationName,
          stationDistanceKm: ctx.overview.stationDistanceKm,
          source: ctx.overview.dataSourceLabel,
          timestampLabel: ctx.overview.lastUpdatedLabel,
          timestampIso: ctx.overview.lastUpdatedIso,
          isStale: ctx.overview.isStale,
          calculatedUsEpaAqi: ctx.overview.aqi,
          usEpaCategory: ctx.overview.aqiCategory,
          primaryPollutant: ctx.overview.aqiPrimaryPollutant,
          measuredPollutants: ctx.overview.pollutants.map((p) => ({
            name: p.displayName,
            value: p.value,
            unit: p.unit,
          })),
          modeledForecastAvailable: false,
        }
      : {
          status: ctx.liveFetchError
            ? 'error'
            : ctx.overview?.status ?? (ctx.profile.location ? 'unavailable' : 'location_required'),
          locationQueried: ctx.profile.location || null,
          limitationReason:
            ctx.liveFetchError ??
            ctx.overview?.integrationNote ??
            'No current OpenAQ station observation is available.',
          calculatedUsEpaAqi: null,
          measuredPollutants: [],
          modeledForecastAvailable: false,
        };

  return [
    'Generate the Daily Planner JSON for all 3 windows (morning, afternoon, evening) using ONLY the verified context below.',
    '',
    JSON.stringify(
      {
        routineWindows: PLANNER_WINDOWS,
        userProfile:
          Object.keys(profileSummary).length > 0
            ? profileSummary
            : { note: 'Use helpful default recommendations for families, commuters, and indoor spaces.' },
        verifiedAirQuality,
      },
      null,
      2
    ),
  ].join('\n');
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parsePlannerGeminiResponse(
  rawText: string | undefined,
  ctx: PlannerBuildContext
): PlannerSectionData[] | null {
  if (!rawText || !rawText.trim()) return null;

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed: Partial<GeminiPlannerResponsePayload>;
  try {
    parsed = JSON.parse(cleaned) as Partial<GeminiPlannerResponsePayload>;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed.windows)) return null;

  const fallbackSections = buildDeterministicPlannerSections(ctx);

  const byPeriod = new Map<PlannerTimeOfDay, GeminiPlannerWindowPayload>();
  for (const w of parsed.windows) {
    if (w && (w.period === 'morning' || w.period === 'afternoon' || w.period === 'evening')) {
      byPeriod.set(w.period, w);
    }
  }

  if (byPeriod.size < 3) {
    return null;
  }

  return fallbackSections.map((fallbackSection) => {
    const aiWin = byPeriod.get(fallbackSection.period);
    if (!aiWin) return fallbackSection;

    const summary = cleanText(aiWin.summary) || fallbackSection.summary;
    const outdoorActivity = cleanText(aiWin.outdoorActivity);
    const smartCommute = cleanText(aiWin.smartCommute);
    const indoorVentilation = cleanText(aiWin.indoorVentilation);
    const familySafety = cleanText(aiWin.familySafety);
    const practicalAction = cleanText(aiWin.practicalAction) || fallbackSection.practicalAction;
    const forecastNote = cleanText(aiWin.forecastNote) || fallbackSection.forecastNote;

    if (!outdoorActivity || !smartCommute || !indoorVentilation || !familySafety) {
      return fallbackSection;
    }

    const fallbackCards = fallbackSection.cards;
    const cards: PlannerCardData[] = [
      {
        ...fallbackCards[0],
        description: outdoorActivity,
      },
      {
        ...fallbackCards[1],
        description: smartCommute,
      },
      {
        ...fallbackCards[2],
        description: indoorVentilation,
      },
      {
        ...fallbackCards[3],
        description: familySafety,
      },
    ];

    return {
      ...fallbackSection,
      summary,
      forecastNote,
      practicalAction,
      cards,
    };
  });
}
