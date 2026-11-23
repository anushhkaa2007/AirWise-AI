import { ArrowRight, Sun, Sunrise, Sunset } from 'lucide-react';
import type { AppPage, PlannerSectionData, PlannerTimeOfDay } from '../../types/airwise.ts';

interface DailyPlannerPreviewProps {
  sections: PlannerSectionData[];
  isLoading?: boolean;
  onNavigate: (page: AppPage) => void;
}

function getPeriodTheme(period: PlannerTimeOfDay) {
  switch (period) {
    case 'morning':
      return {
        icon: Sunrise,
        containerClass: 'border border-[#DFDBD0] bg-[#F7F5EF] text-[#252D29]',
        iconWrapClass: 'bg-[#E5ECE3] text-[#1B4938]',
        timeClass: 'text-[#1B4938]',
        subtextClass: 'text-[#252D29]/80',
        footerClass: 'border-[#E2DFD5] text-[#1B4938]',
        dotClass: 'bg-[#A8BBA6] ring-[#F7F5EF]',
        horizonLabel: 'Dawn dispersion window',
      };
    case 'afternoon':
      return {
        icon: Sun,
        containerClass: 'border border-[#DDD8C8] bg-[#EEECE3] text-[#252D29]',
        iconWrapClass: 'bg-[#C4DC91]/45 text-[#102B22]',
        timeClass: 'text-[#102B22]',
        subtextClass: 'text-[#252D29]/80',
        footerClass: 'border-[#DCD7C8] text-[#102B22]',
        dotClass: 'bg-[#C4DC91] ring-[#F7F5EF]',
        horizonLabel: 'Midday UV & ozone watch',
      };
    case 'evening':
      return {
        icon: Sunset,
        containerClass: 'bg-[#102B22] text-[#F7F5EF]',
        iconWrapClass: 'bg-[#1B4938] text-[#C4DC91]',
        timeClass: 'text-[#C4DC91]',
        subtextClass: 'text-[#A8BBA6]',
        footerClass: 'border-white/10 text-[#C4DC91]',
        dotClass: 'bg-[#102B22] ring-[#A8BBA6]',
        horizonLabel: 'Evening inversion & recovery',
      };
  }
}

export function DailyPlannerPreview({
  sections,
  isLoading = false,
  onNavigate,
}: DailyPlannerPreviewProps) {
  return (
    <section aria-labelledby="dashboard-planner-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#1B4938]">
            Daily Routine Timeline
          </p>
          <h2
            id="dashboard-planner-heading"
            className="mt-1 font-display text-2xl font-medium tracking-tight text-[#102B22]"
          >
            From morning departure to evening recovery
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('planner')}
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-[#102B22] px-4 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#1B4938] sm:self-auto whitespace-nowrap"
        >
          <span>Open Daily Planner</span>
          <ArrowRight className="h-4 w-4 text-[#C4DC91]" aria-hidden="true" />
        </button>
      </div>

      {/* Horizontal atmospheric timeline connector */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="hidden lg:block absolute left-2 right-2 top-[7px] h-0.5 bg-gradient-to-r from-[#A8BBA6] via-[#C4DC91] to-[#102B22]"
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {isLoading && sections.length === 0 && (
            <>
              {['Morning (06:00 – 11:30)', 'Afternoon (11:30 – 17:00)', 'Evening (17:00 – 22:00)'].map(
                (label) => (
                  <div
                    key={label}
                    aria-label={`Loading ${label}`}
                    className="rounded-3xl border border-[#DFDBD0] bg-[#EEECE3] p-6"
                  >
                    <p className="font-display text-base font-medium text-[#102B22]">
                      {label}
                    </p>
                    <div className="mt-4 space-y-2.5 animate-pulse">
                      <div className="h-3.5 w-5/6 rounded bg-[#DDD8C8]" />
                      <div className="h-3.5 w-4/6 rounded bg-[#DDD8C8]" />
                    </div>
                  </div>
                )
              )}
            </>
          )}
          {sections.map((section) => {
            const theme = getPeriodTheme(section.period);
            const Icon = theme.icon;

            return (
              <div key={section.period} className="relative flex flex-col">
                {/* Timeline node */}
                <div className="mb-3 hidden flex-col items-start gap-2 lg:flex">
                  <span
                    aria-hidden="true"
                    className={`relative z-10 h-3.5 w-3.5 rounded-full ring-4 ${theme.dotClass}`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-[#252D29]/75 tabular-nums">
                      {section.timeWindow}
                    </span>
                    <span aria-hidden="true" className="text-[#A8BBA6]">
                      ·
                    </span>
                    <span className="text-xs text-[#252D29]/70">
                      {theme.horizonLabel}
                    </span>
                  </div>
                </div>

                <article
                  className={`flex flex-1 flex-col justify-between rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-0.5 ${theme.containerClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconWrapClass}`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-medium">
                            {section.label}
                          </h3>
                          <p className={`text-xs ${theme.subtextClass}`}>
                            {theme.horizonLabel}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`font-mono text-xs font-medium tabular-nums lg:hidden ${theme.timeClass}`}
                      >
                        {section.timeWindow}
                      </span>
                    </div>

                    <p className={`mt-4 text-sm leading-relaxed ${theme.subtextClass}`}>
                      {section.summary}
                    </p>
                  </div>

                  <div
                    className={`mt-6 flex items-center justify-between gap-2 border-t pt-4 text-xs ${theme.footerClass}`}
                  >
                    <span className="truncate">{section.forecastBasisLabel}</span>
                    <span className="font-mono tabular-nums shrink-0">
                      {section.cards.length} routine areas
                    </span>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
