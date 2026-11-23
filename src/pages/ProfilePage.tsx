import { CheckCircle2, RotateCcw, Save, UserCircle2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { UserProfile } from '../types/airwise.ts';
import {
  COMMUTE_OPTIONS,
  EXERCISE_HABIT_OPTIONS,
  LIFESTYLE_OPTIONS,
  PURIFIER_OPTIONS,
  VENTILATION_PREFERENCE_OPTIONS,
  createEmptyProfile,
} from '../utils/airwiseLogic.ts';

interface ProfilePageProps {
  profile: UserProfile;
  onSaveProfile: (draft: UserProfile) => Promise<void>;
}

export function ProfilePage({ profile, onSaveProfile }: ProfilePageProps) {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      await onSaveProfile(draft);
      setSaveSuccess('Profile preferences saved.');
    } catch (err) {
      const typed = err as Error & { fieldErrors?: Record<string, string> };
      if (typed.fieldErrors) {
        setFieldErrors(typed.fieldErrors);
      }
      setErrorMessage(typed.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearForm = () => {
    setDraft(createEmptyProfile());
    setSaveSuccess(null);
    setErrorMessage(null);
    setFieldErrors({});
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl bg-[#102B22] p-7 text-[#F7F5EF] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1B4938] text-[#C4DC91]">
            <UserCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#C4DC91]">
              PERSONALIZATION PROFILE
            </p>
            <h1 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
              My Profile
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#A8BBA6]">
              Configure your household, lifestyle, and commute details so AirWise AI can tailor exposure windows and indoor air guidance. Optional fields may remain blank.
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#DFDBD0] bg-white p-6 space-y-6 sm:p-8"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="profile-location"
              className="block text-sm font-medium text-[#102B22]"
            >
              Location
            </label>
            <input
              id="profile-location"
              type="text"
              value={draft.location}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="e.g., New Delhi, Bengaluru, London (optional)"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] placeholder:text-[#252D29]/45 transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            />
            {fieldErrors.location && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.location}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-household-type"
              className="block text-sm font-medium text-[#102B22]"
            >
              Household type
            </label>
            <input
              id="profile-household-type"
              type="text"
              value={draft.householdType}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, householdType: e.target.value }))
              }
              placeholder="e.g., Apartment, Independent home, Hostel"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] placeholder:text-[#252D29]/45 transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            />
            {fieldErrors.householdType && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.householdType}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-lifestyle"
              className="block text-sm font-medium text-[#102B22]"
            >
              Lifestyle
            </label>
            <select
              id="profile-lifestyle"
              value={draft.lifestyle}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  lifestyle: e.target.value as UserProfile['lifestyle'],
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            >
              <option value="">Leave blank</option>
              {LIFESTYLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.lifestyle && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.lifestyle}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-children"
              className="block text-sm font-medium text-[#102B22]"
            >
              Children in household
            </label>
            <input
              id="profile-children"
              type="number"
              min={0}
              max={20}
              step={1}
              value={draft.childrenInHousehold}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  childrenInHousehold: e.target.value,
                }))
              }
              placeholder="Optional (0–20)"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] placeholder:text-[#252D29]/45 tabular-nums transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            />
            {fieldErrors.childrenInHousehold && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.childrenInHousehold}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-seniors"
              className="block text-sm font-medium text-[#102B22]"
            >
              Senior citizens in household
            </label>
            <input
              id="profile-seniors"
              type="number"
              min={0}
              max={20}
              step={1}
              value={draft.seniorCitizensInHousehold}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  seniorCitizensInHousehold: e.target.value,
                }))
              }
              placeholder="Optional (0–20)"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] placeholder:text-[#252D29]/45 tabular-nums transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            />
            {fieldErrors.seniorCitizensInHousehold && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.seniorCitizensInHousehold}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-commute"
              className="block text-sm font-medium text-[#102B22]"
            >
              Preferred commute
            </label>
            <select
              id="profile-commute"
              value={draft.preferredCommute}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  preferredCommute: e.target.value as UserProfile['preferredCommute'],
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            >
              <option value="">Leave blank</option>
              {COMMUTE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.preferredCommute && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.preferredCommute}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-purifier"
              className="block text-sm font-medium text-[#102B22]"
            >
              Indoor air purifier
            </label>
            <select
              id="profile-purifier"
              value={draft.indoorAirPurifier}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  indoorAirPurifier: e.target.value as UserProfile['indoorAirPurifier'],
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            >
              <option value="">Leave blank</option>
              {PURIFIER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.indoorAirPurifier && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.indoorAirPurifier}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-departure-time"
              className="block text-sm font-medium text-[#102B22]"
            >
              Commute departure time
            </label>
            <input
              id="profile-departure-time"
              type="time"
              value={draft.commuteDepartureTime ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  commuteDepartureTime: e.target.value,
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            />
            {fieldErrors.commuteDepartureTime && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.commuteDepartureTime}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-exercise-habit"
              className="block text-sm font-medium text-[#102B22]"
            >
              Outdoor exercise habit
            </label>
            <select
              id="profile-exercise-habit"
              value={draft.outdoorExerciseHabit ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  outdoorExerciseHabit: e.target.value as UserProfile['outdoorExerciseHabit'],
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            >
              <option value="">Leave blank</option>
              {EXERCISE_HABIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.outdoorExerciseHabit && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.outdoorExerciseHabit}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="profile-ventilation-preference"
              className="block text-sm font-medium text-[#102B22]"
            >
              Indoor ventilation preference
            </label>
            <select
              id="profile-ventilation-preference"
              value={draft.ventilationPreference ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  ventilationPreference: e.target.value as UserProfile['ventilationPreference'],
                }))
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm text-[#252D29] transition-colors focus:border-[#1B4938] focus:bg-white focus:outline-none"
            >
              <option value="">Leave blank</option>
              {VENTILATION_PREFERENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.ventilationPreference && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.ventilationPreference}
              </p>
            )}
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-[#A8BBA6] bg-[#EEECE3] px-4 py-3 text-sm font-medium text-[#102B22]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1B4938]" aria-hidden="true" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEECE3] pt-5">
          <button
            type="button"
            onClick={handleClearForm}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#DDD8CC] bg-[#F7F5EF] px-4 text-sm font-medium text-[#252D29] transition-colors hover:bg-[#EEECE3] whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Clear fields</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#102B22] px-6 text-sm font-medium text-[#F7F5EF] transition-colors hover:bg-[#1B4938] disabled:opacity-60 whitespace-nowrap"
          >
            <Save className="h-4 w-4 text-[#C4DC91]" aria-hidden="true" />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
