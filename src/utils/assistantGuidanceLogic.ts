import type {
  AirQualityOverviewData,
  AirQualityStatus,
  AqiHealthCategory,
  AssistantResponseMeta,
  AssistantSection,
  ChatMessage,
  UserProfile,
} from '../types/airwise.ts';

export type AssistantTopic =
  | 'family_protection'
  | 'children_play'
  | 'indoor_air'
  | 'senior_citizens'
  | 'commute'
  | 'general';

export interface AssistantReplyInput {
  question: string;
  profile: UserProfile;
  overview: AirQualityOverviewData | null;
  liveFetchError?: string | null;
  timestamp: string;
}

export function classifyAssistantTopics(question: string): AssistantTopic[] {
  const q = question.toLowerCase();
  const matched: AssistantTopic[] = [];

  if (/\b(child|children|kid|kids|toddler|playground|play outside|outdoor play|school)\b/.test(q)) {
    matched.push('children_play');
  }
  if (/\b(senior|seniors|elderly|older adult|older adults|grandparent|grandparents|aged|respiratory|asthma|copd|lung|heart)\b/.test(q)) {
    matched.push('senior_citizens');
  }
  if (/\b(indoor|inside|home air|purifier|hepa|ventilation|ventilate|window|windows|room|cooking|filtration|filter)\b/.test(q)) {
    matched.push('indoor_air');
  }
  if (/\b(commut\w*|travel\w*|traffic|walk\w*|bicycle\w*|bike\w*|cycl\w*|two-wheeler|scooter|bus|metro|train|car|driv\w*|transit)\b/.test(q)) {
    matched.push('commute');
  }
  if (/\b(family|household|protect|everyone|loved ones|home)\b/.test(q)) {
    matched.push('family_protection');
  }

  if (matched.length === 0) {
    matched.push('general');
  }

  return matched;
}

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

function formatLiveReadingSummary(overview: AirQualityOverviewData): string {
  const parts: string[] = [];
  if (overview.pm25) {
    parts.push(`PM2.5: ${overview.pm25.value} ${overview.pm25.unit}`);
  }
  if (overview.pm10) {
    parts.push(`PM10: ${overview.pm10.value} ${overview.pm10.unit}`);
  }
  for (const p of overview.pollutants) {
    if (p.parameter !== 'pm25' && p.parameter !== 'pm10' && parts.length < 6) {
      parts.push(`${p.displayName}: ${p.value} ${p.unit}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'No individual pollutant concentrations reported';
}

function buildLiveTelemetrySection(overview: AirQualityOverviewData): AssistantSection {
  const locationLabel = overview.resolvedLocation || overview.location;
  const distancePart =
    overview.stationDistanceKm !== null ? ` (${overview.stationDistanceKm} km away)` : '';
  const freshnessText = overview.isStale
    ? 'Stale (older than 24 hours — outdoor conditions may have changed since this reading)'
    : 'Current (within 24 hours)';

  const aqiSentence =
    overview.aqi !== null && overview.aqiCategory
      ? `${overview.aqi} US AQI (${overview.aqiCategory}), calculated from measured ${overview.aqiPrimaryPollutant ?? 'particulate'} concentrations using US EPA breakpoints.`
      : 'Not available (insufficient particulate readings to calculate US AQI).';

  return {
    heading: `Latest outdoor readings for ${locationLabel}`,
    bullets: [
      `Monitoring station: ${overview.stationName ?? 'Nearest OpenAQ station'}${distancePart}`,
      `Source & timestamp: ${overview.dataSourceLabel} · ${overview.lastUpdatedLabel}`,
      `Freshness status: ${freshnessText}`,
      `Measured observations: ${formatLiveReadingSummary(overview)}`,
      `Calculated AQI: ${aqiSentence}`,
      'Modeled forecasts: Not connected yet — this snapshot reflects station observations rather than a forecast.',
      'Indoor vs. outdoor note: Outdoor station readings do not measure your indoor air quality, which varies with ventilation, cooking, and air filtration.',
    ],
  };
}

function buildDataDistinctionSection(): AssistantSection {
  return {
    heading: 'How to read air-quality updates',
    bullets: [
      'Measured observations: Raw pollutant concentrations (such as PM2.5 in µg/m³ or NO₂ in ppb) recorded by ground monitoring sensors.',
      'Calculated AQI: A 0–500 health index calculated by AirWise AI from measured particulates—not a separate physical sensor.',
      'Modeled forecasts: Future hourly predictions (not yet connected in AirWise AI).',
      'Indoor air caveat: Outdoor measurements never guarantee indoor air safety; cooking smoke, incense, and sealed rooms can raise indoor particles even on cleaner days.',
    ],
  };
}

function buildMissingDataNotice(
  attemptedLocation: string,
  overview: AirQualityOverviewData | null,
  liveFetchError?: string | null
): string {
  if (liveFetchError) {
    const locText = attemptedLocation ? ` for ${attemptedLocation}` : '';
    return `Notice: Location-specific readings${locText} could not be verified (${liveFetchError}). Guidance above uses general air-quality safety knowledge rather than live AQI numbers (Gemini AI is not enabled).`;
  }
  if (!attemptedLocation) {
    return 'Notice: No city is currently set, so location-specific readings could not be verified. Set a city in the search bar to include nearby OpenAQ station measurements. Guidance above uses general air-quality safety knowledge (Gemini AI is not enabled).';
  }
  if (!overview || overview.status === 'unavailable' || overview.status === 'location_required') {
    const reasonText = overview?.integrationNote
      ? ` ${overview.integrationNote}`
      : '';
    return `Notice: Location-specific advice for ${attemptedLocation} could not be verified because no current OpenAQ station observation was available.${reasonText} Guidance above uses general air-quality safety knowledge without invented AQI values (Gemini AI is not enabled).`;
  }
  return 'Guidance combines verified OpenAQ station observations with general air-quality safety knowledge (Gemini AI is not enabled).';
}

function buildFamilySection(
  band: SeverityBand,
  isStale: boolean,
  profile: UserProfile
): AssistantSection[] {
  let leadParagraph =
    'Protecting your household starts with limiting outdoor exposure during high-pollution or smoky windows while keeping indoor air as clean as possible.';

  if (band === 'unhealthy' || band === 'severe') {
    leadParagraph =
      'Measured outdoor air is in an unhealthy range, so everyone in the household—especially children, older adults, and anyone with asthma or heart/lung conditions—should cut back prolonged outdoor exertion and shift activities indoors.';
  } else if (band === 'sensitive') {
    leadParagraph =
      'Measured outdoor particulates are elevated for sensitive groups. Most healthy adults can handle short errands, while children, older adults, and people with respiratory sensitivities should shorten vigorous outdoor time.';
  } else if (band === 'moderate') {
    leadParagraph =
      'Measured outdoor air is moderate. General family routines can continue with light caution for anyone who is unusually sensitive to particulates or traffic fumes.';
  } else if (band === 'good') {
    leadParagraph =
      'Measured outdoor particulates are currently in the Good range, making it a favorable window for normal outdoor routines and brief cross-ventilation.';
  }

  if (isStale && band !== 'unknown') {
    leadParagraph += ' Because the latest station reading is over 24 hours old, check local haze and visibility before prolonged outdoor plans.';
  }

  const purifierTip =
    profile.indoorAirPurifier === 'Yes'
      ? 'Run your HEPA air purifier in the main living area or bedrooms with doors and windows shut during polluted hours.'
      : profile.indoorAirPurifier === 'No'
        ? 'Consider a true HEPA air purifier (or DIY MERV-13 box-fan filter) for sleeping rooms if hazy days are frequent, and keep windows closed when outdoor air smells smoky or dusty.'
        : 'Keep windows closed during smoggy or high-traffic hours and run a HEPA air purifier in bedrooms if available.';

  return [
    {
      heading: 'Practical steps for the whole household',
      paragraphs: [leadParagraph],
      bullets: [
        'Children: Keep active play shorter during traffic rush hours or early-morning/late-evening smog traps, and watch for coughing or fatigue.',
        'Older adults & respiratory sensitivities: Avoid brisk outdoor exercise near busy roads, keep prescribed inhalers/medications handy, and rest indoors if breathing feels tight.',
        'Commuters: Wear a snug N95, KN95, or KF94 mask when walking, cycling, or riding two-wheelers along congested corridors.',
        `Indoor air & ventilation: ${purifierTip}`,
        'Cleaner daily routines: Vent rooms only during cleaner midday hours when outdoor haze clears, run kitchen exhaust fans while frying or cooking, and skip indoor incense or candles.',
      ],
    },
  ];
}

function buildChildrenPlaySection(
  band: SeverityBand,
  isStale: boolean,
  overview: AirQualityOverviewData | null
): AssistantSection[] {
  let answer =
    'Because children breathe faster per kilogram of body weight and spend more time running outdoors, timing and intensity matter most when air quality is uncertain.';

  if (band === 'severe' || band === 'unhealthy') {
    answer = `Based on the latest calculated AQI of ${overview?.aqi} (${overview?.aqiCategory}), outdoor vigorous play is not recommended right now—move play indoors until station particulates drop.`;
  } else if (band === 'sensitive') {
    answer = `At ${overview?.aqi} US AQI (${overview?.aqiCategory}), short, lighter outdoor play may be tolerable for healthy kids, but children with asthma or allergies—and extended sports—are better kept indoors or kept brief with frequent breaks.`;
  } else if (band === 'moderate') {
    answer = `At ${overview?.aqi} US AQI (${overview?.aqiCategory}), most children can play outside comfortably; kids with asthma or sensitive airways should take breaks if coughing starts.`;
  } else if (band === 'good') {
    answer = `At ${overview?.aqi} US AQI (${overview?.aqiCategory}), outdoor air from the nearest station is currently favorable for normal children's play.`;
  }

  if (isStale && band !== 'unknown') {
    answer += ' Note that the reading is over 24 hours old, so confirm outdoor visibility and air smell before long playground sessions.';
  }

  return [
    {
      heading: 'Outdoor play guidance for children',
      paragraphs: [answer],
      bullets: [
        'Choose parks or courtyards set back from main roads rather than roadside play areas where tailpipe NO₂ and coarse dust spike.',
        'Favor mid-afternoon hours over early dawn or dusk during winter smog, when cool air traps pollution near ground level.',
        'Watch for warning signs—persistent coughing, wheezing, shortness of breath, or unusual tiredness—and move indoors right away if they appear.',
        'Wash hands and faces after outdoor play and keep indoor air cleaner with closed windows during hazy evenings.',
      ],
    },
  ];
}

function buildIndoorAirSection(
  band: SeverityBand,
  profile: UserProfile
): AssistantSection[] {
  const purifierGuidance =
    profile.indoorAirPurifier === 'Yes'
      ? 'Since you have an indoor air purifier, place it in bedrooms or the room your family uses most, keep doors closed to concentrate clean air, and check pre-filters monthly.'
      : 'If you do not have an air purifier, focus on sealing leaky window gaps with weatherstripping, wet-mopping dusty floors, and using a MERV-13 filter or portable HEPA unit in bedrooms when possible.';

  const ventilationNote =
    band === 'good'
      ? 'Outdoor station particulates are currently low, so opening windows briefly for cross-ventilation away from traffic is a practical way to refresh stale indoor air.'
      : band === 'unhealthy' || band === 'severe' || band === 'sensitive'
        ? 'Because outdoor station particulates are elevated, keep exterior windows closed and wait for a cleaner midday window before airing out rooms.'
        : 'Open windows for short cross-ventilation only when outdoor air looks clear and traffic is light; keep windows shut during morning/evening haze or nearby burning.';

  return [
    {
      heading: 'Improving indoor air quality at home',
      paragraphs: [
        'Outdoor station readings never capture indoor pollutants like cooking smoke, dust resuspension, or trapped CO₂—so simple indoor habits make a big difference.',
      ],
      bullets: [
        `Smart ventilation: ${ventilationNote}`,
        `Filtration & dust control: ${purifierGuidance}`,
        'Control indoor sources: Always switch on the kitchen exhaust hood (or crack a nearby kitchen window briefly) while searing or frying, and avoid burning incense, mosquito coils, or scented candles indoors.',
        'Clean without kicking up dust: Use a damp mop or microfiber cloth instead of dry sweeping so settled PM10 dust stays out of the air.',
        'Protect sensitive sleepers: Keep bedroom doors shut at night with clean bedding and, if available, a purifier running on a quiet medium setting.',
      ],
    },
  ];
}

function buildSeniorCitizensSection(
  band: SeverityBand,
  isStale: boolean,
  overview: AirQualityOverviewData | null
): AssistantSection[] {
  let summary =
    'Older adults—and anyone living with asthma, COPD, chronic bronchitis, or heart disease—experience stronger inflammation from fine PM2.5 particles, which penetrate deep into the lungs and bloodstream.';

  if (band === 'severe' || band === 'unhealthy' || band === 'sensitive') {
    summary = `With the nearest station reporting ${overview?.aqi} US AQI (${overview?.aqiCategory}), older adults and people with heart or lung sensitivities should stay indoors with cleaner filtered air and postpone outdoor walks until levels improve.`;
  } else if (band === 'moderate') {
    summary = `With the nearest station at ${overview?.aqi} US AQI (${overview?.aqiCategory}), light outdoor walks are usually manageable, though older adults with asthma or heart conditions should keep walks short and away from busy roads.`;
  } else if (band === 'good') {
    summary = `With the nearest station at ${overview?.aqi} US AQI (${overview?.aqiCategory}), conditions are currently mild for short morning or afternoon walks away from traffic.`;
  }

  if (isStale && band !== 'unknown') {
    summary += ' Because this observation is over 24 hours old, double-check current outdoor haze before heading out.';
  }

  return [
    {
      heading: 'Precautions for senior citizens & respiratory sensitivities',
      paragraphs: [summary],
      bullets: [
        'Skip early-morning winter walks when smog and cold air overlap; choose indoor stretching or wait until mid-afternoon warmth disperses ground-level haze.',
        'Keep rescue inhalers, spacers, blood-pressure medicines, and doctor action plans within easy reach.',
        'Wear a well-sealed N95/KN95/KF94 mask if an outdoor trip is unavoidable, ensuring it feels comfortable to breathe through without gaps at the nose bridge.',
        'Stay hydrated and keep indoor air clean (closed windows during smoky hours, damp dusting, HEPA filtration if available).',
        'Seek medical advice promptly if shortness of breath, chest discomfort, dizziness, or unusual wheezing develops.',
      ],
    },
  ];
}

function buildCommuteSection(
  band: SeverityBand,
  profile: UserProfile,
  overview: AirQualityOverviewData | null
): AssistantSection[] {
  const modeNote = profile.preferredCommute
    ? `Your profile commute mode is set to ${profile.preferredCommute}. `
    : '';

  let intro = `${modeNote}Roadways create concentrated micro-environments of fine exhaust particulates and resuspended dust, often higher than background neighborhood levels.`;
  if (band === 'sensitive' || band === 'unhealthy' || band === 'severe') {
    intro = `${modeNote}With the nearest station at ${overview?.aqi} US AQI (${overview?.aqiCategory}), cutting roadway inhalation is especially important today.`;
  }

  return [
    {
      heading: 'Reducing exposure during your commute',
      paragraphs: [intro],
      bullets: [
        'Choose lower-exposure modes on hazy days: Enclosed transit (metro/AC bus) or a car with windows closed and air conditioning set to "recirculate" (using a clean cabin filter) cuts particulate intake compared to walking, cycling, or riding two-wheelers in heavy traffic.',
        'Use the right mask: Cloth and loose surgical masks do not block fine PM2.5 particles effectively; choose a snug N95, KN95, or KF94 respirator when walking, cycling, or waiting at busy junctions.',
        'Shift route & timing: Leaving 30–60 minutes outside peak rush hour and picking quieter side streets one block off major arteries substantially lowers tailpipe NO₂ and diesel soot.',
        'For cyclists & walkers: Keep exertion steady rather than sprinting in polluted corridors so you breathe less deeply, and rinse your face/throat with water after arriving indoors.',
      ],
    },
  ];
}

function buildGeneralFallbackSection(
  band: SeverityBand,
  overview: AirQualityOverviewData | null
): AssistantSection[] {
  let summary =
    'Everyday air-quality protection comes down to timing outdoor exertion, lowering indoor particle sources, and using proper respiratory protection when particulates rise.';
  if (band !== 'unknown' && overview?.aqi !== null && overview?.aqiCategory) {
    summary = `Based on the latest verified reading (${overview.aqi} US AQI · ${overview.aqiCategory}), match your outdoor time and ventilation choices to the current particulate load while keeping indoor air clean.`;
  }

  return [
    {
      heading: 'Everyday air-quality safety essentials',
      paragraphs: [summary],
      bullets: [
        'Children & outdoor play: Shift strenuous play indoors or to mid-afternoon parks away from traffic when particulates climb.',
        'Older adults & respiratory conditions: Avoid heavy outdoor exertion during smoky hours and keep prescribed inhalers close.',
        'Commuters & masks: Prefer enclosed transit or recirculated cabin air on poor-air days, and wear a well-fitting N95/KN95/KF94 mask along busy roads.',
        'Indoor air & ventilation: Ventilate only during cleaner hours, run a HEPA purifier in sleeping spaces if available, and use kitchen exhaust fans while cooking.',
      ],
    },
  ];
}

function serializeSectionsToText(sections: AssistantSection[], notice: string | null): string {
  const blocks: string[] = [];
  for (const section of sections) {
    const lines: string[] = [];
    if (section.heading) {
      lines.push(section.heading);
    }
    for (const p of section.paragraphs ?? []) {
      lines.push(p);
    }
    for (const b of section.bullets ?? []) {
      lines.push(`• ${b}`);
    }
    if (lines.length > 0) {
      blocks.push(lines.join('\n'));
    }
  }
  if (notice) {
    blocks.push(notice);
  }
  return blocks.join('\n\n');
}

export function buildAssistantReply(input: AssistantReplyInput): ChatMessage {
  const cleanQuestion = input.question.trim();
  const attemptedLocation = input.profile.location.trim();
  const hasLiveData =
    Boolean(input.overview) &&
    (input.overview?.status === 'available' || input.overview?.status === 'stale') &&
    !input.liveFetchError;

  const band = hasLiveData ? getSeverityBand(input.overview) : 'unknown';
  const isStale = Boolean(hasLiveData && input.overview?.isStale);
  const topics = classifyAssistantTopics(cleanQuestion);

  const sections: AssistantSection[] = [];

  if (hasLiveData && input.overview) {
    sections.push(buildLiveTelemetrySection(input.overview));
  }

  const addedHeadings = new Set<string>();
  const pushUnique = (items: AssistantSection[]) => {
    for (const item of items) {
      const key = item.heading ?? item.paragraphs?.[0] ?? '';
      if (!addedHeadings.has(key)) {
        addedHeadings.add(key);
        sections.push(item);
      }
    }
  };

  for (const topic of topics) {
    switch (topic) {
      case 'family_protection':
        pushUnique(buildFamilySection(band, isStale, input.profile));
        break;
      case 'children_play':
        pushUnique(buildChildrenPlaySection(band, isStale, input.overview));
        break;
      case 'indoor_air':
        pushUnique(buildIndoorAirSection(band, input.profile));
        break;
      case 'senior_citizens':
        pushUnique(buildSeniorCitizensSection(band, isStale, input.overview));
        break;
      case 'commute':
        pushUnique(buildCommuteSection(band, input.profile, input.overview));
        break;
      case 'general':
        pushUnique(buildGeneralFallbackSection(band, input.overview));
        break;
    }
  }

  if (!hasLiveData) {
    pushUnique([buildDataDistinctionSection()]);
  }

  const notice = buildMissingDataNotice(
    attemptedLocation,
    input.overview,
    input.liveFetchError
  );

  const liveDataStatus: AirQualityStatus | 'error' = input.liveFetchError
    ? 'error'
    : input.overview?.status ?? (attemptedLocation ? 'unavailable' : 'location_required');

  const meta: AssistantResponseMeta = {
    guidanceMode: hasLiveData ? 'live-and-general' : 'general-only',
    geminiUsed: false,
    locationQueried: attemptedLocation || null,
    liveDataStatus,
    stationName: hasLiveData ? input.overview?.stationName ?? null : null,
    sourceLabel: hasLiveData ? input.overview?.dataSourceLabel ?? null : null,
    timestampLabel: hasLiveData ? input.overview?.lastUpdatedLabel ?? null : null,
    isStale,
    aqi: hasLiveData ? input.overview?.aqi ?? null : null,
    aqiCategory: hasLiveData ? input.overview?.aqiCategory ?? null : null,
    notice,
  };

  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: 'assistant',
    timestamp: input.timestamp,
    content: serializeSectionsToText(sections, notice),
    sections,
    meta,
  };
}
