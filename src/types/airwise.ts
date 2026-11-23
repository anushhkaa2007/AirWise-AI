export type AppPage = 'overview' | 'assistant' | 'profile' | 'planner';

export type LifestyleOption =
  | ''
  | 'Student'
  | 'Working Professional'
  | 'Homemaker'
  | 'Other';

export type CommuteOption =
  | ''
  | 'Walking'
  | 'Bicycle'
  | 'Two-wheeler'
  | 'Car'
  | 'Public Transport';

export type PurifierOption = '' | 'Yes' | 'No';

export type ExerciseHabitOption =
  | ''
  | 'Morning outdoor exercise'
  | 'Afternoon outdoor exercise'
  | 'Evening outdoor exercise'
  | 'Mostly indoors';

export type VentilationPreferenceOption =
  | ''
  | 'Keep windows closed during smog/traffic'
  | 'Open during cleaner midday hours'
  | 'Natural cross-ventilation when clear';

export interface UserProfile {
  location: string;
  householdType: string;
  childrenInHousehold: string;
  seniorCitizensInHousehold: string;
  lifestyle: LifestyleOption;
  preferredCommute: CommuteOption;
  indoorAirPurifier: PurifierOption;
  commuteDepartureTime?: string;
  outdoorExerciseHabit?: ExerciseHabitOption;
  ventilationPreference?: VentilationPreferenceOption;
  updatedAt: string | null;
}

export type AqiHealthCategory =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export interface PollutantMeasurement {
  parameter: string;
  displayName: string;
  value: number;
  unit: string;
  timestamp: string | null;
  isStale: boolean;
}

export type AirQualityStatus =
  | 'available'
  | 'stale'
  | 'unavailable'
  | 'location_required';

export interface AirQualityOverviewData {
  location: string;
  resolvedLocation: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  stationName: string | null;
  stationId: number | null;
  stationDistanceKm: number | null;
  status: AirQualityStatus;
  reason?: string;
  aqi: number | null;
  aqiCategory: AqiHealthCategory | null;
  aqiPrimaryPollutant: string | null;
  pm25: PollutantMeasurement | null;
  pm10: PollutantMeasurement | null;
  pollutants: PollutantMeasurement[];
  aqiLabel: string;
  pm25Label: string;
  pm10Label: string;
  dataSourceLabel: string;
  lastUpdatedLabel: string;
  lastUpdatedIso: string | null;
  isStale: boolean;
  integrationNote: string;
}

export interface RecommendationPlaceholder {
  id: 'smart-commute' | 'indoor-protection' | 'family-safety';
  title: string;
  subtitle: string;
  statusLabel: string;
  description: string;
  profileContextHint: string;
}

export interface PollutantTrendPoint {
  timestamp: string;
  label: string;
  value: number;
}

export interface PollutantTrendInfo {
  pollutant: 'PM2.5' | 'PM10' | 'NO2' | 'O3';
  unit: string;
  status: 'available' | 'unavailable';
  description: string;
  timeSlots: string[];
  points: PollutantTrendPoint[];
}

export type PlannerTimeOfDay = 'morning' | 'afternoon' | 'evening';

export type PlannerGuidanceKind =
  | 'Live Observation'
  | 'Stale Observation'
  | 'Modeled Forecast'
  | 'General Guidance';

export interface PlannerCardData {
  id: string;
  period: PlannerTimeOfDay;
  title: string;
  category: 'Outdoor Activity' | 'Smart Commute' | 'Indoor Ventilation' | 'Family Safety';
  basisLabel: PlannerGuidanceKind;
  description: string;
  personalizationContext: string;
}

export interface PlannerSectionData {
  period: PlannerTimeOfDay;
  label: string;
  timeWindow: string;
  summary: string;
  dataBasisLabel: string;
  forecastBasisLabel: 'Modeled Forecast' | 'Forecast Unavailable';
  forecastNote: string;
  practicalAction: string;
  cards: PlannerCardData[];
}

export interface PlannerDataSourceSummary {
  location: string;
  resolvedLocation: string | null;
  liveDataStatus: AirQualityStatus | 'error';
  stationName: string | null;
  stationDistanceKm: number | null;
  dataSourceLabel: string;
  lastUpdatedLabel: string;
  lastUpdatedIso: string | null;
  isStale: boolean;
  aqi: number | null;
  aqiCategory: AqiHealthCategory | null;
  aqiPrimaryPollutant: string | null;
  pm25Label: string;
  pm10Label: string;
  forecastAvailable: boolean;
  forecastSourceLabel: string;
  guidanceEngine: 'gemini' | 'fallback';
  geminiModel: string | null;
  geminiNotice: string | null;
  limitationNote: string | null;
}

export interface AssistantSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface AssistantResponseMeta {
  guidanceMode: 'gemini-live' | 'gemini-general' | 'live-and-general' | 'general-only';
  geminiUsed: boolean;
  model?: string | null;
  geminiError?: string | null;
  locationQueried: string | null;
  liveDataStatus: AirQualityStatus | 'error';
  stationName: string | null;
  sourceLabel: string | null;
  timestampLabel: string | null;
  isStale: boolean;
  aqi: number | null;
  aqiCategory: AqiHealthCategory | null;
  notice: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sections?: AssistantSection[];
  meta?: AssistantResponseMeta;
  isPendingIntegrationNotice?: boolean;
}
