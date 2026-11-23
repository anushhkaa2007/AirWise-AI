import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUnavailableOverview,
  computeAqiFromMeasurements,
  computePm10Aqi,
  computePm25Aqi,
  getAqiHealthCategory,
  isTimestampExpired,
  isTimestampStale,
  rankOpenAQLocations,
  type OpenAQLocationCandidate,
} from './openaqLogic.ts';

test('computePm25Aqi and computePm10Aqi calculate official EPA breakpoints accurately', () => {
  assert.equal(computePm25Aqi(8.0), 44);
  assert.equal(computePm25Aqi(35.4), 100);
  assert.equal(computePm25Aqi(55.4), 150);
  assert.equal(computePm25Aqi(-2), null);

  assert.equal(computePm10Aqi(54), 50);
  assert.equal(computePm10Aqi(154), 100);
  assert.equal(getAqiHealthCategory(44), 'Good');
  assert.equal(getAqiHealthCategory(125), 'Unhealthy for Sensitive Groups');
  assert.equal(getAqiHealthCategory(220), 'Very Unhealthy');
});

test('computeAqiFromMeasurements picks the higher pollutant sub-index and handles missing data', () => {
  const result = computeAqiFromMeasurements(
    {
      parameter: 'pm25',
      displayName: 'PM2.5',
      value: 42.3,
      unit: 'µg/m³',
      timestamp: '2026-11-21T10:00:00Z',
      isStale: false,
    },
    {
      parameter: 'pm10',
      displayName: 'PM10',
      value: 80,
      unit: 'µg/m³',
      timestamp: '2026-11-21T10:00:00Z',
      isStale: false,
    }
  );
  assert.equal(result.primaryPollutant, 'PM2.5');
  assert.ok(result.aqi !== null && result.aqi > 100);
  assert.equal(result.category, 'Unhealthy for Sensitive Groups');

  const empty = computeAqiFromMeasurements(null, null);
  assert.equal(empty.aqi, null);
  assert.equal(empty.category, null);
});

test('isTimestampStale and isTimestampExpired detect stale (>24h) and expired (>7d) observations', () => {
  const now = Date.parse('2026-11-21T12:00:00Z');
  assert.equal(isTimestampStale('2026-11-21T10:00:00Z', now), false);
  assert.equal(isTimestampStale('2026-11-19T10:00:00Z', now), true);
  assert.equal(isTimestampExpired('2026-11-19T10:00:00Z', now), false);
  assert.equal(isTimestampExpired('2026-11-01T10:00:00Z', now), true);
  assert.equal(isTimestampExpired(null, now), true);
});

test('rankOpenAQLocations prioritizes active stations with both PM2.5 and PM10 sensors', () => {
  const now = Date.parse('2026-11-21T12:00:00Z');
  const candidates: OpenAQLocationCandidate[] = [
    {
      id: 1,
      name: 'Far O3 Only',
      distance: 15000,
      datetimeLast: { utc: '2026-11-21T11:30:00Z' },
      sensors: [{ id: 10, parameter: { name: 'o3' } }],
    },
    {
      id: 2,
      name: 'Old Dual PM Station',
      distance: 1000,
      datetimeLast: { utc: '2026-10-01T11:30:00Z' },
      sensors: [
        { id: 20, parameter: { name: 'pm25' } },
        { id: 21, parameter: { name: 'pm10' } },
      ],
    },
    {
      id: 3,
      name: 'Active Dual PM Station',
      distance: 4200,
      datetimeLast: { utc: '2026-11-21T11:00:00Z' },
      sensors: [
        { id: 30, parameter: { name: 'pm25' } },
        { id: 31, parameter: { name: 'pm10' } },
      ],
    },
    {
      id: 4,
      name: 'Active PM2.5 Only',
      distance: 2000,
      datetimeLast: { utc: '2026-11-21T11:00:00Z' },
      sensors: [{ id: 40, parameter: { name: 'pm25' } }],
    },
  ];

  const ranked = rankOpenAQLocations(candidates, now);
  assert.equal(ranked[0].id, 3);
  assert.equal(ranked[1].id, 4);
});

test('buildUnavailableOverview returns null telemetry without fabricated values', () => {
  const unavailable = buildUnavailableOverview({
    location: 'Pune',
    integrationNote: 'No active station nearby.',
  });
  assert.equal(unavailable.status, 'unavailable');
  assert.equal(unavailable.aqi, null);
  assert.equal(unavailable.pm25, null);
  assert.equal(unavailable.pm10, null);
  assert.deepEqual(unavailable.pollutants, []);
});
