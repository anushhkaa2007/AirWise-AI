import { AlertTriangle, Clock, Database, MapPin, Radio, Wind } from 'lucide-react';
import type { AirQualityOverviewData, AqiHealthCategory } from '../../types/airwise.ts';

interface AirQualityOverviewProps {
  overview: AirQualityOverviewData;
  onFocusLocationSearch: () => void;
}

const HEALTH_CATEGORY_BANDS: Array<{
  label: string;
  matches: AqiHealthCategory[];
  color: string;
}> = [
  { label: 'Good', matches: ['Good'], color: 'bg-[#74A67A]' },
  { label: 'Moderate', matches: ['Moderate'], color: 'bg-[#C4DC91]' },
  {
    label: 'Sensitive',
    matches: ['Unhealthy for Sensitive Groups'],
    color: 'bg-[#E2C275]',
  },
  { label: 'Unhealthy', matches: ['Unhealthy'], color: 'bg-[#D98B5F]' },
  {
    label: 'Severe',
    matches: ['Very Unhealthy', 'Hazardous'],
    color: 'bg-[#B95D50]',
  },
];

function getGaugeStrokeColor(category: AqiHealthCategory | null): string {
  switch (category) {
    case 'Good':
      return '#74A67A';
    case 'Moderate':
      return '#C4DC91';
    case 'Unhealthy for Sensitive Groups':
      return '#E2C275';
    case 'Unhealthy':
      return '#D98B5F';
    case 'Very Unhealthy':
    case 'Hazardous':
      return '#B95D50';
    default:
      return '#C4DC91';
  }
}

export function AirQualityOverview({
  overview,
  onFocusLocationSearch,
}: AirQualityOverviewProps) {
  const hasLocation =
    overview.location && overview.location !== 'No location selected';
  const hasValidAqi =
    (overview.status === 'available' || overview.status === 'stale') &&
    overview.aqi !== null;

  const gaugeTotalArc = 368;
  const filledArc = hasValidAqi
    ? Math.max(18, Math.round((Math.min(overview.aqi ?? 0, 500) / 500) * gaugeTotalArc))
    : 0;
  const gaugeColor = getGaugeStrokeColor(overview.aqiCategory);

  const extraPollutants = overview.pollutants.filter(
    (p) => p.parameter !== 'pm25' && p.parameter !== 'pm10'
  );

  return (
    <section
      aria-labelledby="air-quality-overview-heading"
      className="grid grid-cols-1 overflow-hidden rounded-3xl border border-[#DFDBD0] bg-[#EEECE3] lg:grid-cols-12"
    >
      {/* Left centerpiece: Circular radial AQI visualization */}
      <div className="relative flex flex-col items-center justify-center bg-[#102B22] px-6 py-9 text-[#F7F5EF] lg:col-span-5 lg:px-8">
        <div className="flex w-full items-center justify-between text-xs text-[#A8BBA6]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Radio className="h-3.5 w-3.5 text-[#C4DC91]" aria-hidden="true" />
            <span>
              {hasValidAqi ? 'OpenAQ Live AQI' : 'Live AQI Gauge'}
            </span>
          </span>
          <span className="font-mono">US EPA Scale</span>
        </div>

        <div className="relative my-5 flex h-60 w-60 items-center justify-center">
          <svg
            viewBox="0 0 240 240"
            className="h-full w-full"
            role="img"
            aria-label={
              hasValidAqi
                ? `Air Quality Index ${overview.aqi} (${overview.aqiCategory})`
                : 'Circular air quality gauge awaiting valid local observation'
            }
          >
            <circle
              cx="120"
              cy="120"
              r="104"
              fill="none"
              stroke="#A8BBA6"
              strokeOpacity="0.16"
              strokeWidth="1"
              strokeDasharray="3 7"
            />

            {/* Main 240-degree gauge background track */}
            <circle
              cx="120"
              cy="120"
              r="88"
              fill="none"
              stroke="#1B4938"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${gaugeTotalArc} 553`}
              transform="rotate(150 120 120)"
            />

            {hasValidAqi ? (
              <circle
                cx="120"
                cy="120"
                r="88"
                fill="none"
                stroke={gaugeColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${filledArc} 553`}
                transform="rotate(150 120 120)"
                className="transition-all duration-500"
              />
            ) : (
              <g className="animate-gauge-sweep">
                <circle
                  cx="120"
                  cy="120"
                  r="88"
                  fill="none"
                  stroke="#C4DC91"
                  strokeOpacity="0.45"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="58 495"
                />
              </g>
            )}

            <circle
              cx="120"
              cy="120"
              r="68"
              fill="#15372B"
              stroke="#A8BBA6"
              strokeOpacity="0.2"
              strokeWidth="1"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
            <p className="font-mono text-xs tracking-wider text-[#A8BBA6]">
              AQI INDEX
            </p>
            <p className="mt-1 font-display text-4xl font-medium tracking-tight text-[#F7F5EF] tabular-nums">
              {hasValidAqi ? overview.aqi : '— —'}
            </p>
            {hasValidAqi ? (
              <p
                className="mt-1.5 text-xs font-semibold leading-snug"
                style={{ color: gaugeColor }}
              >
                {overview.aqiCategory}
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium leading-snug text-[#C4DC91]">
                {overview.status === 'location_required'
                  ? 'Select a city to connect'
                  : 'No active AQI observation'}
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#A8BBA6]">
          {hasValidAqi && overview.aqiPrimaryPollutant
            ? `Driven by ${overview.aqiPrimaryPollutant}${overview.isStale ? ' · Observation >24h old' : ''}`
            : overview.stationName
              ? `Nearest station: ${overview.stationName}`
              : 'Choose a city to bind nearby OpenAQ station telemetry'}
        </p>
      </div>

      {/* Right telemetry & metadata matrix */}
      <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
        <div>
          <div className="flex flex-col gap-3 border-b border-[#DCD7CA] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-[#1B4938]">
                Featured Air Quality Telemetry
                {overview.resolvedLocation && overview.resolvedLocation !== overview.location
                  ? ` · ${overview.resolvedLocation}`
                  : ''}
              </p>
              <h2
                id="air-quality-overview-heading"
                className="mt-1 font-display text-2xl font-medium tracking-tight text-[#102B22]"
              >
                {hasLocation
                  ? overview.location
                  : 'Waiting for location selection'}
              </h2>
              {overview.stationName && (
                <p className="mt-1 text-xs text-[#252D29]/75">
                  Station: <span className="font-medium text-[#102B22]">{overview.stationName}</span>
                  {overview.stationDistanceKm !== null
                    ? ` · ${overview.stationDistanceKm} km away`
                    : ''}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onFocusLocationSearch}
              className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl border border-[#C9C4B6] bg-[#F7F5EF] px-4 text-sm font-medium text-[#102B22] transition-colors hover:border-[#1B4938] hover:bg-white sm:self-auto whitespace-nowrap"
            >
              <MapPin className="h-4 w-4 text-[#1B4938]" aria-hidden="true" />
              <span>{hasLocation ? 'Change location' : 'Set location'}</span>
            </button>
          </div>

          {overview.status === 'unavailable' && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#D4CFC2] bg-[#F7F5EF] p-4 text-xs text-[#252D29]">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[#1B4938]"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#102B22]">
                  No live observation available
                </p>
                <p className="mt-0.5 leading-relaxed text-[#252D29]/80">
                  {overview.integrationNote}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F7F5EF] p-5">
              <div className="flex items-center justify-between text-xs font-medium text-[#252D29]/75">
                <span>PM2.5 Fine Particulates</span>
                <Wind className="h-4 w-4 text-[#1B4938]" aria-hidden="true" />
              </div>
              <p className="mt-3 font-mono text-2xl font-medium text-[#102B22] tabular-nums">
                {overview.pm25 ? overview.pm25.value : '— —'}{' '}
                <span className="text-xs font-normal text-[#252D29]/65">
                  {overview.pm25 ? overview.pm25.unit : 'µg/m³'}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-[#1B4938]">
                {overview.pm25
                  ? overview.pm25.isStale
                    ? 'Stale reading (>24h)'
                    : 'Live OpenAQ measurement'
                  : overview.pm25Label}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F7F5EF] p-5">
              <div className="flex items-center justify-between text-xs font-medium text-[#252D29]/75">
                <span>PM10 Coarse Particulates</span>
                <Wind className="h-4 w-4 text-[#1B4938]" aria-hidden="true" />
              </div>
              <p className="mt-3 font-mono text-2xl font-medium text-[#102B22] tabular-nums">
                {overview.pm10 ? overview.pm10.value : '— —'}{' '}
                <span className="text-xs font-normal text-[#252D29]/65">
                  {overview.pm10 ? overview.pm10.unit : 'µg/m³'}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-[#1B4938]">
                {overview.pm10
                  ? overview.pm10.isStale
                    ? 'Stale reading (>24h)'
                    : 'Live OpenAQ measurement'
                  : overview.pm10Label}
              </p>
            </div>
          </div>

          {extraPollutants.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl bg-[#F7F5EF] px-5 py-3.5 text-xs">
              {extraPollutants.map((pollutant) => (
                <div key={pollutant.parameter} className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-[#1B4938]">
                    {pollutant.displayName}
                  </span>
                  <span className="font-mono font-medium text-[#102B22] tabular-nums">
                    {pollutant.value} {pollutant.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Health category indicator track */}
          <div className="mt-5 rounded-2xl bg-[#F7F5EF] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#252D29]">
                Health Category Indicator
              </span>
              <span className="font-mono text-xs font-medium text-[#1B4938]">
                {overview.aqiCategory ?? 'Awaiting valid AQI reading'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">
              {HEALTH_CATEGORY_BANDS.map((band) => {
                const isActive =
                  overview.aqiCategory !== null &&
                  band.matches.includes(overview.aqiCategory);
                return (
                  <div key={band.label} className="space-y-1.5">
                    <div
                      className={`h-2 rounded-full transition-opacity ${band.color} ${
                        overview.aqiCategory === null
                          ? 'opacity-35'
                          : isActive
                            ? 'opacity-100 ring-2 ring-[#102B22]/30'
                            : 'opacity-25'
                      }`}
                    />
                    <p
                      className={`text-[11px] truncate ${
                        isActive
                          ? 'font-semibold text-[#102B22]'
                          : 'text-[#252D29]/70'
                      }`}
                    >
                      {band.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[#DCD7CA] pt-5 sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <Database
              className="mt-0.5 h-4 w-4 shrink-0 text-[#1B4938]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <dt className="text-xs text-[#252D29]/70">Data source</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-[#102B22]">
                {overview.dataSourceLabel}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-[#1B4938]"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs text-[#252D29]/70">Measurement timestamp</dt>
              <dd className="mt-0.5 font-mono text-sm font-medium text-[#102B22] tabular-nums">
                {overview.lastUpdatedLabel}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </section>
  );
}
