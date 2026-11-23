import test from 'node:test';
import assert from 'node:assert/strict';
import type { AirQualityOverviewData } from '../types/airwise.ts';
import { createEmptyProfile } from './airwiseLogic.ts';
import {
  buildDeterministicPlannerSections,
  buildPlannerGeminiUserPrompt,
  buildPlannerSourceSummary,
  parsePlannerGeminiResponse,
} from './plannerLogic.ts';

function createPuneOverview(overrides: Partial<AirQualityOverviewData> = {}): AirQualityOverviewData {
  return {
    location: 'Pune',
    resolvedLocation: 'Pune, Maharashtra, India',
    coordinates: { latitude: 18.5196, longitude: 73.8554 },
    stationName: 'Revenue Colony-Shivajinagar, Pune - IITM',
    stationId: 11613,
    stationDistanceKm: 1.3,
    status: 'available',
    aqi: 116,
    aqiCategory: 'Unhealthy for Sensitive Groups',
    aqiPrimaryPollutant: 'PM2.5',
    pm25: {
      parameter: 'pm25',
      displayName: 'PM2.5',
      value: 41.6,
      unit: 'µg/m³',
      timestamp: '2026-11-21T11:15:00Z',
      isStale: false,
    },
    pm10: {
      parameter: 'pm10',
      displayName: 'PM10',
      value: 151.6,
      unit: 'µg/m³',
      timestamp: '2026-11-21T11:15:00Z',
      isStale: false,
    },
    pollutants: [
      {
        parameter: 'pm25',
        displayName: 'PM2.5',
        value: 41.6,
        unit: 'µg/m³',
        timestamp: '2026-11-21T11:15:00Z',
        isStale: false,
      },
      {
        parameter: 'pm10',
        displayName: 'PM10',
        value: 151.6,
        unit: 'µg/m³',
        timestamp: '2026-11-21T11:15:00Z',
        isStale: false,
      },
    ],
    aqiLabel: '116 US AQI · Unhealthy for Sensitive Groups',
    pm25Label: '41.6 µg/m³',
    pm10Label: '151.6 µg/m³',
    dataSourceLabel: 'OpenAQ API v3 · Revenue Colony-Shivajinagar, Pune - IITM',
    lastUpdatedLabel: 'Nov 21, 11:15 AM UTC',
    lastUpdatedIso: '2026-11-21T11:15:00Z',
    isStale: false,
    integrationNote: 'Live measurements from OpenAQ station.',
    ...overrides,
  };
}

const FORBIDDEN_PLACEHOLDERS = [
  /waiting for live data/i,
  /reserved for/i,
  /gemini slot/i,
  /preferences not set/i,
];

test('builds all three exact time windows without placeholder text even when profile is blank', () => {
  const sections = buildDeterministicPlannerSections({
    profile: { ...createEmptyProfile(), location: 'Pune' },
    overview: createPuneOverview(),
  });

  assert.equal(sections.length, 3);
  assert.deepEqual(
    sections.map((s) => ({ period: s.period, timeWindow: s.timeWindow })),
    [
      { period: 'morning', timeWindow: '06:00 – 11:30' },
      { period: 'afternoon', timeWindow: '11:30 – 17:00' },
      { period: 'evening', timeWindow: '17:00 – 22:00' },
    ]
  );

  for (const section of sections) {
    assert.equal(section.cards.length, 4);
    assert.deepEqual(
      section.cards.map((c) => c.category),
      ['Outdoor Activity', 'Smart Commute', 'Indoor Ventilation', 'Family Safety']
    );
    assert.ok(section.practicalAction.length > 20);
    assert.equal(section.forecastBasisLabel, 'Forecast Unavailable');
    assert.match(section.forecastNote, /forecast is unavailable/i);

    const serialized = JSON.stringify(section);
    for (const pattern of FORBIDDEN_PLACEHOLDERS) {
      assert.equal(pattern.test(serialized), false, `Found placeholder ${pattern}`);
    }
  }
});

test('personalizes commute timing, exercise, purifier, and household members when profile is provided', () => {
  const sections = buildDeterministicPlannerSections({
    profile: {
      ...createEmptyProfile(),
      location: 'Pune',
      childrenInHousehold: '2',
      seniorCitizensInHousehold: '1',
      preferredCommute: 'Two-wheeler',
      commuteDepartureTime: '08:30',
      outdoorExerciseHabit: 'Morning outdoor exercise',
      indoorAirPurifier: 'Yes',
      ventilationPreference: 'Keep windows closed during smog/traffic',
    },
    overview: createPuneOverview(),
  });

  const morning = sections[0];
  const commuteCard = morning.cards.find((c) => c.category === 'Smart Commute');
  const familyCard = morning.cards.find((c) => c.category === 'Family Safety');
  const ventCard = morning.cards.find((c) => c.category === 'Indoor Ventilation');
  const outdoorCard = morning.cards.find((c) => c.category === 'Outdoor Activity');

  assert.ok(commuteCard?.description.includes('08:30'));
  assert.ok(commuteCard?.description.toLowerCase().includes('two-wheeler'));
  assert.match(familyCard?.personalizationContext ?? '', /2 children, 1 senior/);
  assert.match(ventCard?.personalizationContext ?? '', /Purifier: Yes/);
  assert.match(outdoorCard?.personalizationContext ?? '', /Morning outdoor exercise/);
});

test('handles stale readings and missing/unavailable station observations honestly', () => {
  const staleSummary = buildPlannerSourceSummary(
    {
      profile: { ...createEmptyProfile(), location: 'Pune' },
      overview: createPuneOverview({ status: 'stale', isStale: true }),
    },
    { guidanceEngine: 'fallback' }
  );
  assert.equal(staleSummary.liveDataStatus, 'stale');
  assert.equal(staleSummary.isStale, true);
  assert.match(staleSummary.limitationNote ?? '', /older than 24 hours/i);

  const unavailableSummary = buildPlannerSourceSummary(
    {
      profile: { ...createEmptyProfile(), location: 'UnknownTown' },
      overview: {
        ...createPuneOverview(),
        status: 'unavailable',
        stationName: null,
        aqi: null,
        aqiCategory: null,
        pm25: null,
        pm10: null,
        pollutants: [],
        lastUpdatedLabel: 'Unavailable',
        lastUpdatedIso: null,
        integrationNote: 'No OpenAQ stations found nearby.',
      },
    },
    { guidanceEngine: 'fallback' }
  );
  assert.equal(unavailableSummary.liveDataStatus, 'unavailable');
  assert.equal(unavailableSummary.aqi, null);
  assert.equal(unavailableSummary.forecastAvailable, false);
});

test('labels modeled forecast separately only when verified forecast data is provided', () => {
  const sections = buildDeterministicPlannerSections({
    profile: { ...createEmptyProfile(), location: 'Pune' },
    overview: createPuneOverview(),
    modeledForecasts: {
      afternoon: {
        period: 'afternoon',
        sourceLabel: 'Test Modeled Feed',
        summary: 'Modeled afternoon dispersion expected.',
      },
    },
  });

  assert.equal(sections[0].forecastBasisLabel, 'Forecast Unavailable');
  assert.equal(sections[1].forecastBasisLabel, 'Modeled Forecast');
  assert.equal(sections[1].cards[0].basisLabel, 'Modeled Forecast');
  assert.match(sections[1].forecastNote, /Modeled forecast \(Test Modeled Feed\)/);
});

test('parses valid Gemini planner JSON and builds grounded user prompt without forecasts', () => {
  const ctx = {
    profile: { ...createEmptyProfile(), location: 'Pune', preferredCommute: 'Car' as const },
    overview: createPuneOverview(),
  };

  const prompt = buildPlannerGeminiUserPrompt(ctx);
  assert.match(prompt, /"modeledForecastAvailable": false/);
  assert.match(prompt, /Revenue Colony-Shivajinagar, Pune - IITM/);

  const validJson = JSON.stringify({
    windows: [
      {
        period: 'morning',
        summary: 'Morning US EPA AQI baseline is 116.',
        outdoorActivity: 'Keep morning exercise indoors.',
        smartCommute: 'Use car cabin recirculation.',
        indoorVentilation: 'Keep windows closed during rush hour.',
        familySafety: 'Keep children and seniors indoors this morning.',
        practicalAction: 'Check cabin filter and carry an N95 mask.',
        forecastNote: 'No hourly forecast is connected yet.',
      },
      {
        period: 'afternoon',
        summary: 'General midday routine guidance.',
        outdoorActivity: 'Keep errands brief.',
        smartCommute: 'Avoid idling traffic.',
        indoorVentilation: 'Brief midday ventilation only if clear.',
        familySafety: 'Limit strenuous outdoor play.',
        practicalAction: 'Run kitchen exhaust during lunch.',
        forecastNote: 'No hourly forecast is connected yet.',
      },
      {
        period: 'evening',
        summary: 'General evening recovery guidance.',
        outdoorActivity: 'Move evening workouts indoors.',
        smartCommute: 'Return before peak dusk congestion.',
        indoorVentilation: 'Close windows before 17:30.',
        familySafety: 'Settle sleeping rooms early.',
        practicalAction: 'Run HEPA purifier before bedtime.',
        forecastNote: 'No hourly forecast is connected yet.',
      },
    ],
  });

  const parsed = parsePlannerGeminiResponse(validJson, ctx);
  assert.ok(parsed);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].cards[1].description, 'Use car cabin recirculation.');
  assert.equal(parsed[2].practicalAction, 'Run HEPA purifier before bedtime.');
});
