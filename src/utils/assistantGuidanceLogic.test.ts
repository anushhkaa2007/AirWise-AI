import test from 'node:test';
import assert from 'node:assert/strict';
import type { AirQualityOverviewData } from '../types/airwise.ts';
import { createEmptyProfile } from './airwiseLogic.ts';
import { buildAssistantReply, classifyAssistantTopics } from './assistantGuidanceLogic.ts';

function createPuneLiveOverview(overrides?: Partial<AirQualityOverviewData>): AirQualityOverviewData {
  return {
    location: 'Pune',
    resolvedLocation: 'Pune, Maharashtra, India',
    coordinates: { latitude: 18.530085, longitude: 73.849598 },
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
      {
        parameter: 'no2',
        displayName: 'NO₂',
        value: 29.8,
        unit: 'ppb',
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
    integrationNote:
      'Live measurements from OpenAQ station "Revenue Colony-Shivajinagar, Pune - IITM" (1.3 km away).',
    ...overrides,
  };
}

const REQUIRED_QUESTIONS = [
  'How can I protect my family from pollution?',
  'Is it safe for my child to play outside today?',
  'How can I improve indoor air quality?',
  'What precautions should senior citizens take?',
  'How can I reduce my exposure while commuting?',
];

test('classifyAssistantTopics detects all five core safety topics', () => {
  assert.ok(classifyAssistantTopics(REQUIRED_QUESTIONS[0]).includes('family_protection'));
  assert.ok(classifyAssistantTopics(REQUIRED_QUESTIONS[1]).includes('children_play'));
  assert.ok(classifyAssistantTopics(REQUIRED_QUESTIONS[2]).includes('indoor_air'));
  assert.ok(classifyAssistantTopics(REQUIRED_QUESTIONS[3]).includes('senior_citizens'));
  assert.ok(classifyAssistantTopics(REQUIRED_QUESTIONS[4]).includes('commute'));
});

test('all five questions work cleanly with general-guidance fallback when live data is unavailable', () => {
  const profile = createEmptyProfile();

  for (const question of REQUIRED_QUESTIONS) {
    const reply = buildAssistantReply({
      question,
      profile,
      overview: null,
      timestamp: '2026-11-21T12:00:00Z',
    });

    assert.equal(reply.role, 'assistant');
    assert.equal(reply.meta?.geminiUsed, false);
    assert.equal(reply.meta?.guidanceMode, 'general-only');
    assert.equal(reply.meta?.aqi, null);
    assert.ok(reply.sections && reply.sections.length >= 2);
    assert.doesNotMatch(reply.content, /pending connection|currently pending/i);
    assert.match(reply.content, /could not be verified/i);
    assert.match(reply.content, /Measured observations/i);
    assert.match(reply.content, /Calculated AQI/i);
    assert.match(reply.content, /Modeled forecasts/i);
    assert.match(reply.content, /indoor air/i);
  }
});

test('family protection guidance covers children, older adults, commuters, masks, ventilation, and routines', () => {
  const reply = buildAssistantReply({
    question: 'How can I protect my family from pollution?',
    profile: { ...createEmptyProfile(), indoorAirPurifier: 'No' },
    overview: null,
    liveFetchError: 'OpenAQ request timed out',
    timestamp: '2026-11-21T12:00:00Z',
  });

  assert.equal(reply.meta?.liveDataStatus, 'error');
  assert.match(reply.content, /Children:/i);
  assert.match(reply.content, /Older adults & respiratory sensitivities:/i);
  assert.match(reply.content, /Commuters:/i);
  assert.match(reply.content, /N95/i);
  assert.match(reply.content, /Indoor air & ventilation:/i);
  assert.match(reply.content, /Cleaner daily routines:/i);
  assert.match(reply.meta?.notice ?? '', /OpenAQ request timed out/);
});

test('live Pune OpenAQ readings are included accurately with station, units, timestamp, freshness, and caveats', () => {
  const profile = {
    ...createEmptyProfile(),
    location: 'Pune',
    preferredCommute: 'Two-wheeler' as const,
    indoorAirPurifier: 'Yes' as const,
  };
  const overview = createPuneLiveOverview();

  for (const question of REQUIRED_QUESTIONS) {
    const reply = buildAssistantReply({
      question,
      profile,
      overview,
      timestamp: '2026-11-21T12:00:00Z',
    });

    assert.equal(reply.meta?.guidanceMode, 'live-and-general');
    assert.equal(reply.meta?.geminiUsed, false);
    assert.equal(reply.meta?.stationName, 'Revenue Colony-Shivajinagar, Pune - IITM');
    assert.equal(reply.meta?.aqi, 116);
    assert.match(reply.content, /Revenue Colony-Shivajinagar, Pune - IITM/);
    assert.match(reply.content, /41\.6 µg\/m³/);
    assert.match(reply.content, /151\.6 µg\/m³/);
    assert.match(reply.content, /Nov 21, 11:15 AM UTC/);
    assert.match(reply.content, /Current \(within 24 hours\)/);
    assert.match(reply.content, /116 US AQI/);
    assert.match(reply.content, /Modeled forecasts: Not connected yet/i);
    assert.match(reply.content, /do not measure your indoor air quality/i);
  }
});

test('stale observations are explicitly flagged in both metadata and guidance text', () => {
  const reply = buildAssistantReply({
    question: 'Is it safe for my child to play outside today?',
    profile: { ...createEmptyProfile(), location: 'Pune' },
    overview: createPuneLiveOverview({ status: 'stale', isStale: true }),
    timestamp: '2026-11-21T12:00:00Z',
  });

  assert.equal(reply.meta?.isStale, true);
  assert.match(reply.content, /Stale \(older than 24 hours/i);
  assert.match(reply.content, /over 24 hours old/i);
});
