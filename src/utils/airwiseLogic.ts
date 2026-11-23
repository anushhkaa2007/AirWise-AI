import type {
  ChatMessage,
  CommuteOption,
  ExerciseHabitOption,
  LifestyleOption,
  PlannerTimeOfDay,
  PurifierOption,
  UserProfile,
  VentilationPreferenceOption,
} from '../types/airwise.ts';

export const LIFESTYLE_OPTIONS: readonly Exclude<LifestyleOption, ''>[] = [
  'Student',
  'Working Professional',
  'Homemaker',
  'Other',
];

export const COMMUTE_OPTIONS: readonly Exclude<CommuteOption, ''>[] = [
  'Walking',
  'Bicycle',
  'Two-wheeler',
  'Car',
  'Public Transport',
];

export const PURIFIER_OPTIONS: readonly Exclude<PurifierOption, ''>[] = [
  'Yes',
  'No',
];

export const EXERCISE_HABIT_OPTIONS: readonly Exclude<ExerciseHabitOption, ''>[] = [
  'Morning outdoor exercise',
  'Afternoon outdoor exercise',
  'Evening outdoor exercise',
  'Mostly indoors',
];

export const VENTILATION_PREFERENCE_OPTIONS: readonly Exclude<VentilationPreferenceOption, ''>[] = [
  'Keep windows closed during smog/traffic',
  'Open during cleaner midday hours',
  'Natural cross-ventilation when clear',
];

export const SUGGESTED_ASSISTANT_QUESTIONS: readonly string[] = [
  'How can I protect my family from pollution?',
  'Is it safe for children to play outside today?',
  'How can I improve indoor air quality?',
  'What precautions should senior citizens take?',
  'How can I reduce pollution exposure during my commute?',
];

export function createEmptyProfile(): UserProfile {
  return {
    location: '',
    householdType: '',
    childrenInHousehold: '',
    seniorCitizensInHousehold: '',
    lifestyle: '',
    preferredCommute: '',
    indoorAirPurifier: '',
    commuteDepartureTime: '',
    outdoorExerciseHabit: '',
    ventilationPreference: '',
    updatedAt: null,
  };
}

export function normalizeLocation(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function validateProfileInput(
  input: Partial<UserProfile>
): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: UserProfile;
} {
  const errors: Record<string, string> = {};

  const location = normalizeLocation(String(input.location ?? ''));
  if (location.length > 100) {
    errors.location = 'Location must be 100 characters or fewer.';
  }

  const householdType = String(input.householdType ?? '').trim();
  if (householdType.length > 80) {
    errors.householdType = 'Household type must be 80 characters or fewer.';
  }

  const childrenInHousehold = String(input.childrenInHousehold ?? '').trim();
  if (childrenInHousehold !== '') {
    const parsed = Number(childrenInHousehold);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 20) {
      errors.childrenInHousehold = 'Enter a whole number between 0 and 20, or leave blank.';
    }
  }

  const seniorCitizensInHousehold = String(input.seniorCitizensInHousehold ?? '').trim();
  if (seniorCitizensInHousehold !== '') {
    const parsed = Number(seniorCitizensInHousehold);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 20) {
      errors.seniorCitizensInHousehold = 'Enter a whole number between 0 and 20, or leave blank.';
    }
  }

  const rawLifestyle = String(input.lifestyle ?? '').trim() as LifestyleOption;
  const lifestyle: LifestyleOption =
    rawLifestyle === '' || LIFESTYLE_OPTIONS.includes(rawLifestyle)
      ? rawLifestyle
      : '';
  if (rawLifestyle !== '' && lifestyle === '') {
    errors.lifestyle = 'Please select a valid lifestyle option.';
  }

  const rawCommute = String(input.preferredCommute ?? '').trim() as CommuteOption;
  const preferredCommute: CommuteOption =
    rawCommute === '' || COMMUTE_OPTIONS.includes(rawCommute)
      ? rawCommute
      : '';
  if (rawCommute !== '' && preferredCommute === '') {
    errors.preferredCommute = 'Please select a valid commute option.';
  }

  const rawPurifier = String(input.indoorAirPurifier ?? '').trim() as PurifierOption;
  const indoorAirPurifier: PurifierOption =
    rawPurifier === '' || PURIFIER_OPTIONS.includes(rawPurifier)
      ? rawPurifier
      : '';
  if (rawPurifier !== '' && indoorAirPurifier === '') {
    errors.indoorAirPurifier = 'Please choose Yes, No, or leave blank.';
  }

  const commuteDepartureTime = String(input.commuteDepartureTime ?? '').trim();
  if (
    commuteDepartureTime !== '' &&
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(commuteDepartureTime)
  ) {
    errors.commuteDepartureTime = 'Enter a valid 24-hour time (HH:MM) or leave blank.';
  }

  const rawExercise = String(input.outdoorExerciseHabit ?? '').trim() as ExerciseHabitOption;
  const outdoorExerciseHabit: ExerciseHabitOption =
    rawExercise === '' || EXERCISE_HABIT_OPTIONS.includes(rawExercise)
      ? rawExercise
      : '';
  if (rawExercise !== '' && outdoorExerciseHabit === '') {
    errors.outdoorExerciseHabit = 'Please select a valid outdoor exercise option.';
  }

  const rawVentilation = String(
    input.ventilationPreference ?? ''
  ).trim() as VentilationPreferenceOption;
  const ventilationPreference: VentilationPreferenceOption =
    rawVentilation === '' || VENTILATION_PREFERENCE_OPTIONS.includes(rawVentilation)
      ? rawVentilation
      : '';
  if (rawVentilation !== '' && ventilationPreference === '') {
    errors.ventilationPreference = 'Please select a valid ventilation preference.';
  }

  const sanitized: UserProfile = {
    location,
    householdType,
    childrenInHousehold,
    seniorCitizensInHousehold,
    lifestyle,
    preferredCommute,
    indoorAirPurifier,
    commuteDepartureTime,
    outdoorExerciseHabit,
    ventilationPreference,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : null,
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

export function formatProfileContextLine(profile: UserProfile): string {
  const parts: string[] = [];
  if (profile.location) parts.push(profile.location);
  if (profile.lifestyle) parts.push(profile.lifestyle);
  if (profile.preferredCommute) parts.push(`Commute: ${profile.preferredCommute}`);
  if (profile.indoorAirPurifier) parts.push(`Purifier: ${profile.indoorAirPurifier}`);
  if (parts.length === 0) {
    return 'Profile details not set yet';
  }
  return parts.join(' · ');
}

export function buildPendingAssistantReply(
  question: string,
  profile: UserProfile,
  timestamp: string
): ChatMessage {
  const cleanQuestion = question.trim();
  const locationContext = profile.location
    ? `for ${profile.location}`
    : 'for your selected location (not set yet)';

  const profileNotes: string[] = [];
  if (profile.lifestyle) profileNotes.push(`Lifestyle: ${profile.lifestyle}`);
  if (profile.preferredCommute) profileNotes.push(`Commute: ${profile.preferredCommute}`);
  if (profile.childrenInHousehold) profileNotes.push(`Children: ${profile.childrenInHousehold}`);
  if (profile.seniorCitizensInHousehold) profileNotes.push(`Senior citizens: ${profile.seniorCitizensInHousehold}`);
  if (profile.indoorAirPurifier) profileNotes.push(`Indoor air purifier: ${profile.indoorAirPurifier}`);

  const contextSummary =
    profileNotes.length > 0
      ? `Saved profile context ready for personalization (${profileNotes.join(' · ')}).`
      : 'You can also complete your My Profile details so future guidance matches your household and commute.';

  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: 'assistant',
    timestamp,
    isPendingIntegrationNotice: true,
    content: `Live air-quality data and Gemini AI integration are currently pending for "${cleanQuestion}" ${locationContext}. Once live station feeds and Gemini reasoning are connected in the next stage, AirWise AI will evaluate real-time AQI, PM2.5, and PM10 levels before answering. ${contextSummary}`,
  };
}

export function getPlannerPeriodLabel(period: PlannerTimeOfDay): string {
  switch (period) {
    case 'morning':
      return 'Morning';
    case 'afternoon':
      return 'Afternoon';
    case 'evening':
      return 'Evening';
  }
}
