import { Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AirQualityStatus, PollutantTrendInfo } from '../../types/airwise.ts';
import {
  buildCombinedParticulateSeries,
  buildSinglePollutantSeries,
  type TrendViewMode,
} from '../../utils/pollutantTrendsLogic.ts';

interface PollutantTrendsCardProps {
  trends: PollutantTrendInfo[];
  location: string;
  overviewStatus?: AirQualityStatus;
  hasStation?: boolean;
}

interface CustomTooltipPayloadItem {
  dataKey?: string;
  name?: string;
  value?: number | null;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
  unitMap: Record<string, string>;
}

function PollutantChartTooltip({
  active,
  payload,
  label,
  unitMap,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const validEntries = payload.filter(
    (entry) => typeof entry.value === 'number' && Number.isFinite(entry.value)
  );
  if (validEntries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#1B4938]/30 bg-[#102B22] px-4 py-3 text-xs text-[#F7F5EF] shadow-lg">
      <p className="font-mono text-[#C4DC91] tabular-nums">{label} UTC</p>
      <div className="mt-1.5 space-y-1">
        {validEntries.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? 'value');
          const unit = unitMap[key] ?? 'µg/m³';
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[#A8BBA6]">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? '#C4DC91' }}
                />
                <span>{entry.name}</span>
              </span>
              <span className="font-mono font-semibold tabular-nums text-[#F7F5EF]">
                {entry.value} {unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PollutantTrendsCard({
  trends,
  location,
  overviewStatus,
  hasStation = false,
}: PollutantTrendsCardProps) {
  const [viewMode, setViewMode] = useState<TrendViewMode>('PM2.5 & PM10');

  const combinedSeries = useMemo(
    () => buildCombinedParticulateSeries(trends),
    [trends]
  );

  const selectedSingleTrend = useMemo(
    () =>
      viewMode === 'PM2.5 & PM10'
        ? undefined
        : trends.find((t) => t.pollutant === viewMode),
    [trends, viewMode]
  );

  const singleSeries = useMemo(
    () => buildSinglePollutantSeries(selectedSingleTrend),
    [selectedSingleTrend]
  );

  if (trends.length === 0) {
    return null;
  }

  const isCombined = viewMode === 'PM2.5 & PM10';
  const hasAnyPoints = isCombined
    ? combinedSeries.hasAnyData
    : singleSeries.hasData;
  const yAxisMax = isCombined ? combinedSeries.yAxisMax : singleSeries.yAxisMax;

  const headingTitle = isCombined
    ? 'Pollutant Trends · 24h PM2.5 / PM10'
    : `Pollutant Trends · ${selectedSingleTrend?.pollutant ?? viewMode} (${selectedSingleTrend?.unit ?? 'µg/m³'})`;

  const subtitle = isCombined
    ? 'Last 24 hours of measured fine (PM2.5) and coarse (PM10) particulate concentrations in µg/m³.'
    : selectedSingleTrend?.description ?? '';

  const tabs: TrendViewMode[] = ['PM2.5 & PM10', 'PM2.5', 'PM10', 'NO2', 'O3'];

  const unavailableTargetLabel = isCombined
    ? 'PM2.5 or PM10'
    : selectedSingleTrend?.pollutant ?? viewMode;

  const unitMap: Record<string, string> = isCombined
    ? {
        pm25: combinedSeries.pm25Unit,
        pm10: combinedSeries.pm10Unit,
      }
    : {
        value: selectedSingleTrend?.unit ?? 'µg/m³',
      };

  return (
    <section
      aria-labelledby="pollutant-trends-heading"
      className="rounded-3xl border border-[#DFDBD0] bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 border-b border-[#EEECE3] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-[#1B4938]">
            Pollutant Data Visualization ·{' '}
            {hasAnyPoints
              ? 'OpenAQ 24-Hour Hourly Observations'
              : 'Hourly Telemetry Grid'}
          </p>
          <h2
            id="pollutant-trends-heading"
            className="mt-1 font-display text-2xl font-medium tracking-tight text-[#102B22]"
          >
            {headingTitle}
          </h2>
          <p className="mt-1 text-sm text-[#252D29]/75">{subtitle}</p>
        </div>

        <div
          className="flex flex-wrap items-center gap-1 rounded-xl bg-[#EEECE3] p-1 self-start lg:self-auto"
          role="tablist"
          aria-label="Select pollutant trend view"
        >
          {tabs.map((tab) => {
            const isSelected = viewMode === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setViewMode(tab)}
                className={`rounded-lg px-2.5 sm:px-3.5 py-2 text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#102B22] text-[#F7F5EF]'
                    : 'text-[#252D29]/75 hover:text-[#102B22]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Series legend & particulate availability bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {isCombined ? (
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#102B22]" aria-hidden="true" />
              <span className="font-medium text-[#102B22]">
                PM2.5 ({combinedSeries.pm25Unit})
              </span>
              {!combinedSeries.hasPm25 && (
                <span className="text-[#252D29]/55">· 24h series unavailable</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6E8F3D]" aria-hidden="true" />
              <span className="font-medium text-[#102B22]">
                PM10 ({combinedSeries.pm10Unit})
              </span>
              {!combinedSeries.hasPm10 && (
                <span className="text-[#252D29]/55">· 24h series unavailable</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#102B22]" aria-hidden="true" />
            <span className="font-medium text-[#102B22]">
              {selectedSingleTrend?.pollutant} ({selectedSingleTrend?.unit})
            </span>
          </div>
        )}

        <span className="font-mono text-[11px] text-[#252D29]/60">
          {hasAnyPoints
            ? `${isCombined ? combinedSeries.data.length : singleSeries.data.length} hourly observations`
            : 'No 24h observations reported'}
        </span>
      </div>

      <div className="mt-4">
        <div className="relative rounded-2xl bg-[#F7F5EF] p-4 sm:p-6">
          <div className="h-64 w-full min-w-0 sm:h-72">
            {hasAnyPoints ? (
              <ResponsiveContainer width="100%" height="100%">
                {isCombined ? (
                  <AreaChart
                    data={combinedSeries.data}
                    margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#102B22" stopOpacity={0.26} />
                        <stop offset="95%" stopColor="#102B22" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="pm10Fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84A84D" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#84A84D" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#E2DED3"
                      strokeDasharray="3 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#A8BBA6"
                      tick={{
                        fill: '#252D29',
                        fillOpacity: 0.65,
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      domain={[0, yAxisMax]}
                      stroke="#A8BBA6"
                      tick={{
                        fill: '#252D29',
                        fillOpacity: 0.65,
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={<PollutantChartTooltip unitMap={unitMap} />}
                    />
                    {combinedSeries.hasPm10 && (
                      <Area
                        type="monotone"
                        dataKey="pm10"
                        name="PM10"
                        stroke="#6E8F3D"
                        strokeWidth={2.25}
                        fill="url(#pm10Fill)"
                        dot={{ r: 2.5, fill: '#6E8F3D', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#C4DC91', stroke: '#102B22', strokeWidth: 1.5 }}
                        connectNulls={false}
                      />
                    )}
                    {combinedSeries.hasPm25 && (
                      <Area
                        type="monotone"
                        dataKey="pm25"
                        name="PM2.5"
                        stroke="#102B22"
                        strokeWidth={2.5}
                        fill="url(#pm25Fill)"
                        dot={{ r: 3, fill: '#1B4938', stroke: '#102B22', strokeWidth: 1 }}
                        activeDot={{ r: 5, fill: '#C4DC91', stroke: '#102B22', strokeWidth: 1.5 }}
                        connectNulls={false}
                      />
                    )}
                  </AreaChart>
                ) : (
                  <AreaChart
                    data={singleSeries.data}
                    margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="singlePollutantFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B4938" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1B4938" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#E2DED3"
                      strokeDasharray="3 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#A8BBA6"
                      tick={{
                        fill: '#252D29',
                        fillOpacity: 0.65,
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      domain={[0, yAxisMax]}
                      stroke="#A8BBA6"
                      tick={{
                        fill: '#252D29',
                        fillOpacity: 0.65,
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={<PollutantChartTooltip unitMap={unitMap} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={selectedSingleTrend?.pollutant ?? viewMode}
                      stroke="#102B22"
                      strokeWidth={2.5}
                      fill="url(#singlePollutantFill)"
                      dot={{ r: 3, fill: '#1B4938', stroke: '#102B22', strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#C4DC91', stroke: '#102B22', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex max-w-md items-center gap-3.5 rounded-2xl border border-[#DFDBD0] bg-white px-5 py-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#102B22] text-[#C4DC91]">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#102B22]">
                      No hourly {unavailableTargetLabel} history available
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#252D29]/75">
                      {!location
                        ? 'Select a city to load available hourly OpenAQ pollutant curves.'
                        : overviewStatus === 'unavailable' || !hasStation
                          ? `No active OpenAQ station or hourly ${unavailableTargetLabel} observation is available near ${location}.`
                          : `The selected station near ${location} has not published recent 24h hourly averages for ${unavailableTargetLabel}.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
