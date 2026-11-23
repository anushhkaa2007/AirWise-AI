import type { UserProfile } from '../../src/types/airwise.ts';
import {
  createEmptyProfile,
  normalizeLocation,
  validateProfileInput,
} from '../../src/utils/airwiseLogic.ts';

let currentProfile: UserProfile = createEmptyProfile();

export async function getUserProfile(): Promise<UserProfile> {
  return { ...currentProfile };
}

export async function saveUserProfile(
  payload: Partial<UserProfile>
): Promise<{ ok: true; profile: UserProfile } | { ok: false; errors: Record<string, string> }> {
  const validation = validateProfileInput(payload);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  currentProfile = {
    ...validation.sanitized,
    updatedAt: new Date().toISOString(),
  };

  return { ok: true, profile: { ...currentProfile } };
}

export async function updateActiveLocation(locationInput: string): Promise<UserProfile> {
  const normalized = normalizeLocation(locationInput);
  currentProfile = {
    ...currentProfile,
    location: normalized,
    updatedAt: new Date().toISOString(),
  };
  return { ...currentProfile };
}
