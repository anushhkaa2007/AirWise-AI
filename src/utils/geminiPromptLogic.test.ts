import test from 'node:test';
import assert from 'node:assert/strict';
import type { AirQualityOverviewData } from '../types/airwise.ts';
import { createEmptyProfile } from './airwiseLogic.ts';
import {
  buildGeminiSystemInstruction,
  buildGeminiUserPrompt,
  parseGeminiStructuredResponse,
  serializeGroundingContext,
} from './geminiPromptLogic.ts';

function createPuneOverview(): AirQualityOverviewData {
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
    ],
    aqiLabel: '116 US AQI · Unhealthy for Sensitive Groups',
    pm25Label: '41.6 µg/m³',
    pm10Label: '151.6 µg/m³',
    dataSourceLabel: 'OpenAQ API v3 · Revenue Colony-Shivajinagar, Pune - IITM',
    lastUpdatedLabel: 'Nov 21, 11:15 AM UTC',
    lastUpdatedIso: '2026-11-21T11:15:00Z',
    isStale: false,
    integrationNote: 'Live measurements from OpenAQ station.',
  };
}

test('buildGeminiSystemInstruction enforces strict accuracy and medical/plant/AQI boundaries', () => {
  const sys = buildGeminiSystemInstruction();
  assert.match(sys, /NEVER invent/i);
  assert.match(sys, /US EPA AQI/i);
  assert.match(sys, /CPCB AQI/i);
  assert.match(sys, /modeled forecasts/i);
  assert.match(sys, /indoor air quality/i);
  assert.match(sys, /medical diagnoses/i);
  assert.match(sys, /houseplants/i);
});

test('serializeGroundingContext embeds verified OpenAQ measurements and omits numbers when unavailable', () => {
  const profile = {
    ...createEmptyProfile(),
    location: 'Pune',
    childrenInHousehold: '1',
    preferredCommute: 'Bicycle' as const,
  };

  const liveContext = serializeGroundingContext({
    question: 'Is it safe for children to play outside today?',
    profile,
    overview: createPuneOverview(),
  });
  const liveAq = liveContext.verifiedAirQuality as Record<string, unknown>;
  assert.equal(liveAq.calculatedUsEpaAqi, 116);
  assert.equal(liveAq.stationName, 'Revenue Colony-Shivajinagar, Pune - IITM');
  assert.equal(liveAq.modeledForecastsConnected, false);

  const missingContext = serializeGroundingContext({
    question: 'How can I protect my family from pollution?',
    profile: createEmptyProfile(),
    overview: null,
  });
  const missingAq = missingContext.verifiedAirQuality as Record<string, unknown>;
  assert.equal(missingAq.calculatedUsEpaAqi, null);
  assert.deepEqual(missingAq.measuredPollutants, []);
  assert.match(buildGeminiUserPrompt({
    question: 'How can I protect my family?',
    profile: createEmptyProfile(),
    overview: null,
  }), /"calculatedUsEpaAqi": null/);
});

test('parseGeminiStructuredResponse maps valid JSON to ChatMessage and rejects malformed payloads', () => {
  const profile = { ...createEmptyProfile(), location: 'Pune' };
  const overview = createPuneOverview();

  const validJson = JSON.stringify({
    directAnswer: 'Short, light outdoor play is fine for healthy children, while kids with asthma should play indoors.',
    airQualityContext: 'Station Revenue Colony-Shivajinagar, Pune - IITM measured PM2.5 at 41.6 µg/m³ and calculated US EPA AQI is 116 (Unhealthy for Sensitive Groups) at Nov 21, 11:15 AM UTC.',
    personalizedRecommendations: [
      'Keep active play away from busy roads.',
      'Take frequent breaks if anyone coughs or feels short of breath.',
    ],
    actionsForToday: [
      'Choose mid-afternoon outdoor windows over dawn or dusk smog.',
      'Keep windows closed during evening traffic peaks.',
    ],
    safetyCaveats: [
      'Outdoor station readings do not reflect indoor air quality.',
      'Modeled forecasts are not connected yet.',
    ],
  });

  const msg = parseGeminiStructuredResponse(validJson, {
    model: 'gemini-4-hydrogen',
    profile,
    overview,
    timestamp: '2026-11-21T12:55:00Z',
  });

  assert.ok(msg);
  assert.equal(msg.meta?.geminiUsed, true);
  assert.equal(msg.meta?.model, 'gemini-4-hydrogen');
  assert.equal(msg.meta?.guidanceMode, 'gemini-live');
  assert.equal(msg.meta?.aqi, 116);
  assert.equal(msg.sections?.length, 5);
  assert.match(msg.content, /Direct answer/);
  assert.match(msg.content, /Practical actions for today/);

  const invalidMsg = parseGeminiStructuredResponse('not valid json {', {
    model: 'gemini-4-hydrogen',
    profile,
    overview,
    timestamp: '2026-11-21T12:55:00Z',
  });
  assert.equal(invalidMsg, null);
});
