import type { PlannerCardData, PlannerGuidanceKind } from '../../types/airwise.ts';

interface RecommendationSlotCardProps {
  card: PlannerCardData;
  dark?: boolean;
}

function getBasisBadgeClass(kind: PlannerGuidanceKind, dark: boolean): string {
  if (kind === 'Modeled Forecast') {
    return dark
      ? 'bg-[#C4DC91]/20 text-[#C4DC91]'
      : 'bg-[#E5ECE3] text-[#102B22]';
  }
  if (kind === 'Live Observation') {
    return dark
      ? 'bg-[#C4DC91] text-[#102B22]'
      : 'bg-[#102B22] text-[#F7F5EF]';
  }
  if (kind === 'Stale Observation') {
    return dark
      ? 'bg-amber-900/50 text-amber-200'
      : 'bg-amber-100 text-amber-900';
  }
  return dark
    ? 'bg-white/10 text-[#A8BBA6]'
    : 'bg-[#EEECE3] text-[#252D29]/80';
}

export function RecommendationSlotCard({
  card,
  dark = false,
}: RecommendationSlotCardProps) {
  return (
    <article
      className={`flex flex-col justify-between rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-0.5 ${
        dark
          ? 'bg-[#1B4938] text-[#F7F5EF]'
          : 'border border-[#DFDBD0] bg-white text-[#252D29]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className={dark ? 'font-semibold text-[#C4DC91]' : 'font-semibold text-[#1B4938]'}>
            {card.category}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${getBasisBadgeClass(
              card.basisLabel,
              dark
            )}`}
          >
            {card.basisLabel}
          </span>
        </div>

        <h3
          className={`mt-3 font-display text-lg font-medium ${
            dark ? 'text-[#F7F5EF]' : 'text-[#102B22]'
          }`}
        >
          {card.title}
        </h3>
        <p
          className={`mt-2 text-sm leading-relaxed ${
            dark ? 'text-[#F7F5EF]/85' : 'text-[#252D29]/85'
          }`}
        >
          {card.description}
        </p>
      </div>

      <div
        className={`mt-5 border-t pt-3.5 text-xs ${
          dark
            ? 'border-white/15 text-[#A8BBA6]'
            : 'border-[#EEECE3] text-[#252D29]/70'
        }`}
      >
        Tailored to ·{' '}
        <span className={dark ? 'font-medium text-[#F7F5EF]' : 'font-medium text-[#102B22]'}>
          {card.personalizationContext}
        </span>
      </div>
    </article>
  );
}
