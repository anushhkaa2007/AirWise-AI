import type {
  AirQualityOverviewData,
  AppPage,
  PlannerSectionData,
  PollutantTrendInfo,
  RecommendationPlaceholder,
  UserProfile,
} from '../types/airwise.ts';
import { formatProfileContextLine } from '../utils/airwiseLogic.ts';
import { AirQualityOverview } from '../components/dashboard/AirQualityOverview.tsx';
import { DailyPlannerPreview } from '../components/dashboard/DailyPlannerPreview.tsx';
import { HeroAtmosphere } from '../components/dashboard/HeroAtmosphere.tsx';
import { PollutantTrendsCard } from '../components/dashboard/PollutantTrendsCard.tsx';
import { RecommendationCards } from '../components/dashboard/RecommendationCards.tsx';
import { LoadingState } from '../components/ui/LoadingState.tsx';

interface OverviewPageProps {
  profile: UserProfile;
  overview: AirQualityOverviewData | null;
  recommendations: RecommendationPlaceholder[];
  trends: PollutantTrendInfo[];
  plannerSections: PlannerSectionData[];
  isLoading: boolean;
  isPlannerLoading?: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onNavigate: (page: AppPage) => void;
  onFocusLocationSearch: () => void;
}

export function OverviewPage({
  profile,
  overview,
  recommendations,
  trends,
  plannerSections,
  isLoading,
  isPlannerLoading = false,
  errorMessage,
  onRetry,
  onNavigate,
  onFocusLocationSearch,
}: OverviewPageProps) {
  if (isLoading && !overview) {
    return <LoadingState label="Loading air quality overview" />;
  }

  if (errorMessage && !overview) {
    return (
      <div className="rounded-3xl border border-[#DFDBD0] bg-[#EEECE3] p-8 text-center">
        <p className="font-display text-xl font-medium text-[#102B22]">
          Unable to load dashboard foundation
        </p>
        <p className="mt-2 text-sm text-[#252D29]/80">{errorMessage}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#102B22] px-5 text-sm font-medium text-[#F7F5EF] hover:bg-[#1B4938]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <HeroAtmosphere
        location={profile.location}
        profileLine={formatProfileContextLine(profile)}
        onNavigate={onNavigate}
        onFocusLocationSearch={onFocusLocationSearch}
      />

      {overview && (
        <AirQualityOverview
          overview={overview}
          onFocusLocationSearch={onFocusLocationSearch}
        />
      )}

      <RecommendationCards
        recommendations={recommendations}
        onNavigate={onNavigate}
      />

      <DailyPlannerPreview
        sections={plannerSections}
        isLoading={isPlannerLoading}
        onNavigate={onNavigate}
      />

      <PollutantTrendsCard
        trends={trends}
        location={profile.location}
        overviewStatus={overview?.status}
        hasStation={Boolean(overview?.stationName)}
      />
    </div>
  );
}
