import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { TopNav } from './components/layout/TopNav.tsx';
import { AssistantPage } from './pages/AssistantPage.tsx';
import { DailyPlannerPage } from './pages/DailyPlannerPage.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { apiClient, type OverviewResponse } from './services/apiClient.ts';
import type {
  AirQualityOverviewData,
  AppPage,
  ChatMessage,
  PlannerDataSourceSummary,
  PlannerSectionData,
  PollutantTrendInfo,
  RecommendationPlaceholder,
  UserProfile,
} from './types/airwise.ts';
import { createEmptyProfile } from './utils/airwiseLogic.ts';

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(createEmptyProfile);
  const [overview, setOverview] = useState<AirQualityOverviewData | null>(null);
  const [recommendations, setRecommendations] = useState<
    RecommendationPlaceholder[]
  >([]);
  const [trends, setTrends] = useState<PollutantTrendInfo[]>([]);
  const [plannerSections, setPlannerSections] = useState<PlannerSectionData[]>(
    []
  );
  const [plannerSourceSummary, setPlannerSourceSummary] =
    useState<PlannerDataSourceSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlannerLoading, setIsPlannerLoading] = useState(true);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-message',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content:
        'Welcome to AirWise AI. Ask about outdoor play for children, protecting older adults, commute exposure, or improving indoor air quality.',
      sections: [
        {
          heading: 'Practical air-quality guidance, grounded in verified readings',
          paragraphs: [
            'Ask any question below or pick a suggested topic. When you set a city in the search bar, I check the latest OpenAQ monitoring station observations before sharing tailored safety tips.',
          ],
          bullets: [
            'Covers children, older adults, commuters, and people with respiratory sensitivities.',
            'Clearly separates measured station readings, calculated US AQI, and general safety guidance.',
          ],
        },
      ],
    },
  ]);

  const loadPlannerData = useCallback(
    async (options?: { location?: string; refresh?: boolean }) => {
      setIsPlannerLoading(true);
      setPlannerError(null);
      try {
        const plannerRes = await apiClient.getPlanner(options);
        setPlannerSections(plannerRes.sections);
        setPlannerSourceSummary(plannerRes.sourceSummary);
      } catch (error) {
        setPlannerError(
          error instanceof Error
            ? error.message
            : 'Unable to load Daily Planner recommendations.'
        );
      } finally {
        setIsPlannerLoading(false);
      }
    },
    []
  );

  const loadWorkspaceData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const profileRes = await apiClient.getProfile();
      setProfile(profileRes.profile);

      const plannerPromise = loadPlannerData({
        location: profileRes.profile.location,
      });

      const airRes = await apiClient.getAirQuality(profileRes.profile.location);
      setOverview(airRes.overview);
      setRecommendations(airRes.recommendations);
      setTrends(airRes.trends);
      setIsLoading(false);

      await plannerPromise;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load AirWise AI workspace.'
      );
      setIsLoading(false);
    }
  }, [loadPlannerData]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const refreshDerivedViews = useCallback(
    async (locationOverride?: string) => {
      const plannerPromise = loadPlannerData({ location: locationOverride });
      const airRes = await apiClient.getAirQuality(locationOverride);
      setOverview(airRes.overview);
      setRecommendations(airRes.recommendations);
      setTrends(airRes.trends);
      await plannerPromise;
    },
    [loadPlannerData]
  );

  const handleLocationSubmit = async (newLocation: string) => {
    setIsUpdatingLocation(true);
    try {
      const { profile: updatedProfile } =
        await apiClient.updateLocation(newLocation);
      setProfile(updatedProfile);
      await refreshDerivedViews(updatedProfile.location);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleSaveProfile = async (draft: UserProfile) => {
    const { profile: savedProfile } = await apiClient.saveProfile(draft);
    setProfile(savedProfile);
    await refreshDerivedViews(savedProfile.location);
  };

  const handleFocusLocationSearch = () => {
    const desktopInput = document.getElementById('top-location-search');
    const mobileInput = document.getElementById('mobile-location-search');
    const target =
      desktopInput instanceof HTMLInputElement && desktopInput.offsetParent !== null
        ? desktopInput
        : mobileInput;
    if (target instanceof HTMLInputElement) {
      target.focus();
      target.select();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F7F5EF] text-[#252D29]">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        activeLocation={profile.location}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          activeLocation={profile.location}
          onLocationSubmit={handleLocationSubmit}
          onNavigate={setActivePage}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          isUpdatingLocation={isUpdatingLocation}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={activePage} className="animate-page-enter">
            {activePage === 'overview' && (
              <OverviewPage
                profile={profile}
                overview={overview}
                recommendations={recommendations}
                trends={trends}
                plannerSections={plannerSections}
                isLoading={isLoading}
                isPlannerLoading={isPlannerLoading}
                errorMessage={errorMessage}
                onRetry={loadWorkspaceData}
                onNavigate={setActivePage}
                onFocusLocationSearch={handleFocusLocationSearch}
              />
            )}

            {activePage === 'assistant' && (
              <AssistantPage
                profile={profile}
                overview={overview}
                messages={assistantMessages}
                onMessagesChange={setAssistantMessages}
                onAirQualitySync={(airRes: OverviewResponse) => {
                  setOverview(airRes.overview);
                  setRecommendations(airRes.recommendations);
                  setTrends(airRes.trends);
                  void loadPlannerData({
                    location: airRes.overview.location || profile.location,
                  });
                }}
              />
            )}

            {activePage === 'profile' && (
              <ProfilePage
                profile={profile}
                onSaveProfile={handleSaveProfile}
              />
            )}

            {activePage === 'planner' && (
              <DailyPlannerPage
                sections={plannerSections}
                sourceSummary={plannerSourceSummary}
                location={profile.location}
                isLoading={isPlannerLoading}
                errorMessage={plannerError}
                onRefresh={() =>
                  void loadPlannerData({
                    location: profile.location,
                    refresh: true,
                  })
                }
                onNavigate={setActivePage}
                onFocusLocationSearch={handleFocusLocationSearch}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
