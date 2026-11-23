import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  RefreshCw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { useState } from 'react';
import { RecommendationSlotCard } from '../components/planner/RecommendationSlotCard.tsx';
import { LoadingState } from '../components/ui/LoadingState.tsx';
import type {
  AppPage,
  PlannerDataSourceSummary,
  PlannerSectionData,
  PlannerTimeOfDay,
} from '../types/airwise.ts';

interface DailyPlannerPageProps {
  sections: PlannerSectionData[];
  sourceSummary: PlannerDataSourceSummary | null;
  location: string;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onNavigate: (page: AppPage) => void;
  onFocusLocationSearch: () => void;
}

function getPeriodDesign(period: PlannerTimeOfDay) {
  switch (period) {
    case 'morning':
      return {
        icon: Sunrise,
        bandClass: 'border border-[#DFDBD0] bg-[#F7F5EF] text-[#102B22]',
        iconClass: 'bg-[#E5ECE3] text-[#1B4938]',
        subtextClass: 'text-[#252D29]/75',
        timeClass: 'text-[#1B4938]',
        actionWrapClass: 'border border-[#D8D3C6] bg-[#EEECE3] text-[#102B22]',
        actionLabelClass: 'text-[#1B4938]',
        forecastWrapClass: 'text-[#252D29]/70',
        darkCards: false,
      };
    case 'afternoon':
      return {
        icon: Sun,
        bandClass: 'border border-[#DDD8C8] bg-[#EEECE3] text-[#102B22]',
        iconClass: 'bg-[#C4DC91]/50 text-[#102B22]',
        subtextClass: 'text-[#252D29]/80',
        timeClass: 'text-[#102B22]',
        actionWrapClass: 'border border-[#D5D0C1] bg-[#F7F5EF] text-[#102B22]',
        actionLabelClass: 'text-[#1B4938]',
        forecastWrapClass: 'text-[#252D29]/75',
        darkCards: false,
      };
    case 'evening':
      return {
        icon: Sunset,
        bandClass: 'bg-[#102B22] text-[#F7F5EF]',
        iconClass: 'bg-[#1B4938] text-[#C4DC91]',
        subtextClass: 'text-[#A8BBA6]',
        timeClass: 'text-[#C4DC91]',
        actionWrapClass: 'border border-white/15 bg-[#1B4938]/80 text-[#F7F5EF]',
        actionLabelClass: 'text-[#C4DC91]',
        forecastWrapClass: 'text-[#A8BBA6]',
        darkCards: true,
      };
  }
}

function getObservationStatusMeta(summary: PlannerDataSourceSummary | null) {
  if (!summary) {
    return {
      label: 'General Guidance',
      badgeClass: 'bg-[#EEECE3] text-[#102B22]',
    };
  }
  switch (summary.liveDataStatus) {
    case 'available':
      return {
        label: 'Live Observation',
        badgeClass: 'bg-[#102B22] text-[#C4DC91]',
      };
    case 'stale':
      return {
        label: 'Stale Observation (>24h)',
        badgeClass: 'bg-amber-100 text-amber-900',
      };
    case 'location_required':
      return {
        label: 'Location Needed',
        badgeClass: 'bg-[#EEECE3] text-[#102B22]',
      };
    default:
      return {
        label: 'Observations Unavailable',
        badgeClass: 'bg-stone-200 text-[#252D29]',
      };
  }
}

export function DailyPlannerPage({
  sections,
  sourceSummary,
  location,
  isLoading,
  errorMessage,
  onRefresh,
  onNavigate,
  onFocusLocationSearch,
}: DailyPlannerPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | PlannerTimeOfDay>('all');

  if (isLoading && sections.length === 0) {
    return <LoadingState label="Building personalized daily planner from verified air-quality data" rows={3} />;
  }

  const visibleSections =
    selectedPeriod === 'all'
      ? sections
      : sections.filter((section) => section.period === selectedPeriod);

  const obsBadge = getObservationStatusMeta(sourceSummary);
  const hasObservation =
    sourceSummary?.liveDataStatus === 'available' ||
    sourceSummary?.liveDataStatus === 'stale';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 rounded-3xl bg-[#102B22] p-7 text-[#F7F5EF] lg:flex-row lg:items-center lg:justify-between sm:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#C4DC91]">
            DAILY ROUTINE TIMELINE · {location ? location.toUpperCase() : 'NO LOCATION SET'}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            Daily Planner
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#A8BBA6]">
            Practical guidance across Morning (06:00–11:30), Afternoon (11:30–17:00), and Evening (17:00–22:00), combining verified OpenAQ station observations with your household profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-[#1B4938] px-3.5 text-xs font-semibold text-[#F7F5EF] transition-colors hover:bg-[#235B46] disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#C4DC91] ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isLoading ? 'Refreshing...' : 'Refresh Plan'}</span>
          </button>

          <div
            className="flex flex-wrap items-center gap-1 rounded-xl bg-[#1B4938] p-1"
            role="tablist"
            aria-label="Filter planner time of day"
          >
            {(['all', 'morning', 'afternoon', 'evening'] as const).map((period) => {
              const isSelected = selectedPeriod === period;
              const label =
                period === 'all'
                  ? 'All Day'
                  : period.charAt(0).toUpperCase() + period.slice(1);
              return (
                <button
                  key={period}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-lg px-2.5 sm:px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#C4DC91] text-[#102B22]'
                      : 'text-[#A8BBA6] hover:text-[#F7F5EF]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-9 shrink-0 items-center rounded-lg bg-red-800 px-3.5 text-xs font-semibold text-white hover:bg-red-900 self-start sm:self-auto"
          >
            Retry
          </button>
        </div>
      )}

      {/* Observation, Forecast & Personalization Provenance Strip */}
      {sourceSummary && (
        <section
          aria-label="Planner data sources and freshness"
          className="grid grid-cols-1 gap-4 rounded-3xl border border-[#DFDBD0] bg-[#EEECE3] p-5 lg:grid-cols-3 sm:p-6"
        >
          <div className="rounded-2xl bg-[#F7F5EF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-[#1B4938] uppercase">
                Station Baseline
              </span>
              <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${obsBadge.badgeClass}`}>
                {obsBadge.label}
              </span>
            </div>

            {hasObservation ? (
              <div className="mt-2.5 space-y-1 text-xs text-[#252D29]">
                <p className="font-medium text-[#102B22]">
                  {sourceSummary.aqi !== null && sourceSummary.aqiCategory
                    ? `${sourceSummary.aqi} US EPA AQI · ${sourceSummary.aqiCategory}`
                    : `PM2.5: ${sourceSummary.pm25Label}`}
                </p>
                <p className="flex items-start gap-1.5 text-[#252D29]/80">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1B4938]" aria-hidden="true" />
                  <span>
                    {sourceSummary.stationName ?? sourceSummary.location}
                    {sourceSummary.stationDistanceKm !== null
                      ? ` (${sourceSummary.stationDistanceKm} km away)`
                      : ''}
                  </span>
                </p>
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-[#252D29]/75">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-[#1B4938]" aria-hidden="true" />
                  <span>
                    {sourceSummary.dataSourceLabel} · {sourceSummary.lastUpdatedLabel}
                  </span>
                </p>
              </div>
            ) : (
              <div className="mt-2.5 space-y-2 text-xs text-[#252D29]/80">
                <p>
                  {sourceSummary.limitationNote ??
                    'No active OpenAQ observation is available for this location.'}
                </p>
                {sourceSummary.liveDataStatus === 'location_required' && (
                  <button
                    type="button"
                    onClick={onFocusLocationSearch}
                    className="font-semibold text-[#1B4938] hover:underline"
                  >
                    Set a city in the search bar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#F7F5EF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-[#1B4938] uppercase">
                Hourly Forecast Status
              </span>
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                  sourceSummary.forecastAvailable
                    ? 'bg-[#C4DC91]/40 text-[#102B22]'
                    : 'bg-stone-200 text-[#252D29]'
                }`}
              >
                {sourceSummary.forecastAvailable ? 'Modeled Forecast' : 'Forecast Unavailable'}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#252D29]/80">
              {sourceSummary.forecastAvailable
                ? `Using modeled hourly forecasts from ${sourceSummary.forecastSourceLabel} for upcoming windows.`
                : 'No hourly air-quality forecast feed is integrated yet. Current OpenAQ readings reflect station observations only—future windows use general diurnal guidance rather than predicted AQI.'}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F7F5EF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-[#1B4938] uppercase">
                Routine Guidance Engine
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                  sourceSummary.guidanceEngine === 'gemini'
                    ? 'bg-[#102B22] text-[#C4DC91]'
                    : 'bg-[#E5ECE3] text-[#1B4938]'
                }`}
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>
                  {sourceSummary.guidanceEngine === 'gemini'
                    ? 'Gemini AI + OpenAQ'
                    : 'General Safety Fallback'}
                </span>
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#252D29]/80">
              {sourceSummary.geminiNotice
                ? sourceSummary.geminiNotice
                : 'Personalized from your saved household, commute, exercise, and indoor purifier profile (useful urban defaults apply for any blank fields).'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="mt-2 text-xs font-semibold text-[#1B4938] hover:underline"
            >
              Adjust household & commute profile
            </button>
          </div>
        </section>
      )}

      {/* Horizontal time-band overview strip on desktop */}
      {selectedPeriod === 'all' && sections.length > 0 && (
        <div
          aria-hidden="true"
          className="hidden lg:grid grid-cols-3 gap-4 rounded-2xl bg-[#EEECE3] p-4"
        >
          {sections.map((section) => (
            <div key={section.period} className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-[#102B22]">
                {section.label}
              </span>
              <span className="font-mono text-xs text-[#1B4938] tabular-nums">
                {section.timeWindow}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {visibleSections.map((section) => {
          const design = getPeriodDesign(section.period);
          const Icon = design.icon;
          return (
            <section
              key={section.period}
              aria-labelledby={`planner-${section.period}-heading`}
              className={`rounded-3xl p-6 sm:p-7 ${design.bandClass}`}
            >
              <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${design.iconClass}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id={`planner-${section.period}-heading`}
                        className="font-display text-xl font-medium"
                      >
                        {section.label}
                      </h2>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${
                          design.darkCards
                            ? 'bg-white/10 text-[#C4DC91]'
                            : 'bg-white/80 text-[#1B4938] border border-[#DFDBD0]'
                        }`}
                      >
                        {section.dataBasisLabel}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${
                          section.forecastBasisLabel === 'Modeled Forecast'
                            ? 'bg-[#C4DC91] text-[#102B22]'
                            : design.darkCards
                              ? 'bg-white/10 text-[#A8BBA6]'
                              : 'bg-stone-200/80 text-[#252D29]/80'
                        }`}
                      >
                        {section.forecastBasisLabel}
                      </span>
                    </div>
                    <p className={`mt-1.5 text-sm leading-relaxed ${design.subtextClass}`}>
                      {section.summary}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono text-xs font-medium tabular-nums shrink-0 ${design.timeClass}`}
                >
                  {section.timeWindow}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {section.cards.map((card) => (
                  <RecommendationSlotCard
                    key={card.id}
                    card={card}
                    dark={design.darkCards}
                  />
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <div className={`rounded-2xl p-4 ${design.actionWrapClass}`}>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${design.actionLabelClass}`}
                      aria-hidden="true"
                    />
                    <div className="text-sm leading-relaxed">
                      <span className={`font-semibold ${design.actionLabelClass}`}>
                        Practical action:{' '}
                      </span>
                      <span>{section.practicalAction}</span>
                    </div>
                  </div>
                </div>

                <p className={`flex items-start gap-2 text-xs leading-relaxed ${design.forecastWrapClass}`}>
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{section.forecastNote}</span>
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
