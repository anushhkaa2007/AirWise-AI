import { ArrowUpRight, Bike, Home, ShieldCheck } from 'lucide-react';
import type { AppPage, RecommendationPlaceholder } from '../../types/airwise.ts';

interface RecommendationCardsProps {
  recommendations: RecommendationPlaceholder[];
  onNavigate: (page: AppPage) => void;
}

export function RecommendationCards({
  recommendations,
  onNavigate,
}: RecommendationCardsProps) {
  const commute = recommendations.find((r) => r.id === 'smart-commute');
  const indoor = recommendations.find((r) => r.id === 'indoor-protection');
  const family = recommendations.find((r) => r.id === 'family-safety');

  return (
    <section aria-labelledby="recommendations-heading" className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#1B4938]">
            Personalized Insights
          </p>
          <h2
            id="recommendations-heading"
            className="mt-1 font-display text-2xl font-medium tracking-tight text-[#102B22]"
          >
            Built around how you move and live
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-[#102B22] transition-colors hover:text-[#1B4938] hover:underline sm:self-auto whitespace-nowrap"
        >
          <span>Refine profile preferences</span>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Card 1: Smart Commute (Wide dark forest feature panel) */}
        {commute && (
          <article className="group relative overflow-hidden rounded-3xl bg-[#1B4938] p-7 text-[#F7F5EF] transition-transform duration-200 hover:-translate-y-0.5 lg:col-span-7">
            <svg
              viewBox="0 0 320 140"
              className="pointer-events-none absolute right-0 bottom-0 h-36 w-64 opacity-25"
              aria-hidden="true"
            >
              <path
                d="M 10 120 Q 95 40 180 88 T 315 24"
                fill="none"
                stroke="#C4DC91"
                strokeWidth="2.5"
                strokeDasharray="6 6"
              />
              <circle cx="95" cy="70" r="5" fill="#C4DC91" />
              <circle cx="245" cy="64" r="5" fill="#F7F5EF" />
            </svg>

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#102B22] text-[#C4DC91]">
                    <Bike className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs text-[#C4DC91]">
                    {commute.statusLabel}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-xl font-medium text-[#F7F5EF]">
                  {commute.title}
                </h3>
                <p className="mt-1 text-xs text-[#A8BBA6]">{commute.subtitle}</p>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#F7F5EF]/85">
                  {commute.description}
                </p>
              </div>

              <div className="mt-6 border-t border-white/15 pt-4 text-xs text-[#C4DC91]">
                {commute.profileContextHint}
              </div>
            </div>
          </article>
        )}

        {/* Card 2: Indoor Air Protection (Soft cream architectural card) */}
        {indoor && (
          <article className="group relative overflow-hidden rounded-3xl border border-[#DFDBD0] bg-[#EEECE3] p-7 text-[#252D29] transition-transform duration-200 hover:-translate-y-0.5 lg:col-span-5">
            <svg
              viewBox="0 0 180 180"
              className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 opacity-35"
              aria-hidden="true"
            >
              <circle cx="110" cy="110" r="32" fill="none" stroke="#1B4938" strokeWidth="1.5" />
              <circle cx="110" cy="110" r="54" fill="none" stroke="#1B4938" strokeWidth="1.25" strokeDasharray="4 5" />
              <circle cx="110" cy="110" r="76" fill="none" stroke="#A8BBA6" strokeWidth="1.25" />
            </svg>

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#102B22] text-[#F7F5EF]">
                    <Home className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs text-[#1B4938]">
                    {indoor.statusLabel}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-xl font-medium text-[#102B22]">
                  {indoor.title}
                </h3>
                <p className="mt-1 text-xs text-[#252D29]/70">{indoor.subtitle}</p>
                <p className="mt-4 text-sm leading-relaxed text-[#252D29]/85">
                  {indoor.description}
                </p>
              </div>

              <div className="mt-6 border-t border-[#D8D3C6] pt-4 text-xs font-medium text-[#1B4938]">
                {indoor.profileContextHint}
              </div>
            </div>
          </article>
        )}

        {/* Card 3: Family Safety (Full-width editorial protection strip) */}
        {family && (
          <article className="group relative overflow-hidden rounded-3xl border border-[#DFDBD0] bg-[#F7F5EF] p-7 transition-transform duration-200 hover:-translate-y-0.5 lg:col-span-12">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEECE3] text-[#102B22]">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-medium text-[#102B22]">
                      {family.title}
                    </h3>
                    <p className="text-xs text-[#252D29]/70">
                      {family.subtitle} · {family.statusLabel}
                    </p>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#252D29]/85">
                  {family.description}
                </p>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#EEECE3] p-5 lg:col-span-4">
                <p className="text-xs font-medium text-[#1B4938]">
                  Household Sensitivity Context
                </p>
                <p className="text-sm font-medium text-[#102B22]">
                  {family.profileContextHint}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-[#102B22] hover:text-[#1B4938] hover:underline"
                >
                  <span>Update household profile</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
