import test from 'node:test';
import assert from 'node:assert/strict';
import type { PollutantTrendInfo } from '../types/airwise.ts';
import {
  buildCombinedParticulateSeries,
  buildSinglePollutantSeries,
} from './pollutantTrendsLogic.ts';

function makeTrend(
  pollutant: PollutantTrendInfo['pollutant'],
  points: PollutantTrendInfo['points']
): PollutantTrendInfo {
  return {
    pollutant,
    unit: pollutant === 'NO2' || pollutant === 'O3' ? 'ppb' : 'µg/m³',
    status: points.length > 0 ? 'available' : 'unavailable',
    description: `${pollutant} description`,
    timeSlots: ['00:00', '06:00', '12:00', '18:00'],
    points,
  };
}

test('merges PM2.5 and PM10 measurements chronologically without inventing missing points', () => {
  const trends: PollutantTrendInfo[] = [
    makeTrend('PM2.5', [
      { timestamp: '2026-11-21T10:00:00Z', label: '10:00', value: 42.1 },
      { timestamp: '2026-11-21T08:00:00Z', label: '08:00', value: 55.4 },
    ]),
    makeTrend('PM10', [
      { timestamp: '2026-11-21T10:00:00Z', label: '10:00', value: 120.5 },
      { timestamp: '2026-11-21T09:00:00Z', label: '09:00', value: 140.0 },
    ]),
  ];

  const result = buildCombinedParticulateSeries(trends);
  assert.equal(result.hasPm25, true);
  assert.equal(result.hasPm10, true);
  assert.equal(result.hasAnyData, true);
  assert.equal(result.data.length, 3);
  assert.deepEqual(
    result.data.map((d) => ({ timeLabel: d.timeLabel, pm25: d.pm25, pm10: d.pm10 })),
    [
      { timeLabel: '08:00', pm25: 55.4, pm10: null },
      { timeLabel: '09:00', pm25: null, pm10: 140.0 },
      { timeLabel: '10:00', pm25: 42.1, pm10: 120.5 },
    ]
  );
  assert.ok(result.yAxisMax >= 160);
});

test('handles unavailable PM10 history while still rendering available PM2.5 observations', () => {
  const trends: PollutantTrendInfo[] = [
    makeTrend('PM2.5', [
      { timestamp: '2026-11-21T11:00:00Z', label: '11:00', value: 38.2 },
    ]),
    makeTrend('PM10', []),
  ];

  const result = buildCombinedParticulateSeries(trends);
  assert.equal(result.hasPm25, true);
  assert.equal(result.hasPm10, false);
  assert.equal(result.hasAnyData, true);
  assert.equal(result.data[0].pm10, null);
});

test('returns empty single-pollutant series safely when no measurements exist', () => {
  const empty = buildSinglePollutantSeries(makeTrend('NO2', []));
  assert.equal(empty.hasData, false);
  assert.deepEqual(empty.data, []);
});
