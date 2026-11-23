import type { PollutantTrendInfo } from '../types/airwise.ts';

export type TrendViewMode = 'PM2.5 & PM10' | PollutantTrendInfo['pollutant'];

export interface RechartsCombinedDatum {
  timestamp: string;
  timeLabel: string;
  pm25: number | null;
  pm10: number | null;
}

export interface RechartsSingleDatum {
  timestamp: string;
  timeLabel: string;
  value: number;
}

export interface CombinedParticulateSeries {
  data: RechartsCombinedDatum[];
  hasPm25: boolean;
  hasPm10: boolean;
  hasAnyData: boolean;
  pm25Unit: string;
  pm10Unit: string;
  yAxisMax: number;
}

export function buildCombinedParticulateSeries(
  trends: PollutantTrendInfo[]
): CombinedParticulateSeries {
  const pm25Trend = trends.find((t) => t.pollutant === 'PM2.5');
  const pm10Trend = trends.find((t) => t.pollutant === 'PM10');

  const byKey = new Map<string, RechartsCombinedDatum>();

  const ensureEntry = (timestamp: string, timeLabel: string): RechartsCombinedDatum => {
    const parsed = Date.parse(timestamp);
    const key = Number.isFinite(parsed)
      ? new Date(parsed).toISOString().slice(0, 16)
      : timeLabel;

    let existing = byKey.get(key);
    if (!existing) {
      existing = {
        timestamp,
        timeLabel,
        pm25: null,
        pm10: null,
      };
      byKey.set(key, existing);
    }
    return existing;
  };

  for (const pt of pm25Trend?.points ?? []) {
    if (typeof pt.value === 'number' && Number.isFinite(pt.value) && pt.value >= 0) {
      const entry = ensureEntry(pt.timestamp, pt.label);
      entry.pm25 = pt.value;
    }
  }

  for (const pt of pm10Trend?.points ?? []) {
    if (typeof pt.value === 'number' && Number.isFinite(pt.value) && pt.value >= 0) {
      const entry = ensureEntry(pt.timestamp, pt.label);
      entry.pm10 = pt.value;
    }
  }

  const data = Array.from(byKey.values()).sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );

  const hasPm25 = data.some((d) => d.pm25 !== null);
  const hasPm10 = data.some((d) => d.pm10 !== null);
  const hasAnyData = hasPm25 || hasPm10;

  let maxVal = 0;
  for (const d of data) {
    if (d.pm25 !== null && d.pm25 > maxVal) maxVal = d.pm25;
    if (d.pm10 !== null && d.pm10 > maxVal) maxVal = d.pm10;
  }

  const yAxisMax = maxVal > 0 ? Math.ceil((maxVal * 1.15) / 10) * 10 : 100;

  return {
    data,
    hasPm25,
    hasPm10,
    hasAnyData,
    pm25Unit: pm25Trend?.unit ?? 'µg/m³',
    pm10Unit: pm10Trend?.unit ?? 'µg/m³',
    yAxisMax,
  };
}

export function buildSinglePollutantSeries(
  trend: PollutantTrendInfo | undefined
): {
  data: RechartsSingleDatum[];
  hasData: boolean;
  yAxisMax: number;
} {
  if (!trend || trend.points.length === 0) {
    return { data: [], hasData: false, yAxisMax: 100 };
  }

  const data = trend.points
    .filter((pt) => typeof pt.value === 'number' && Number.isFinite(pt.value) && pt.value >= 0)
    .map((pt) => ({
      timestamp: pt.timestamp,
      timeLabel: pt.label,
      value: pt.value,
    }))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const maxVal = data.reduce((acc, d) => (d.value > acc ? d.value : acc), 0);
  const yAxisMax = maxVal > 0 ? Math.ceil((maxVal * 1.15) / 10) * 10 : 100;

  return {
    data,
    hasData: data.length > 0,
    yAxisMax,
  };
}
