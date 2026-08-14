/**
 * Persistence.
 *
 * A returning user's streak is the whole product, so losing it to a bad write or a
 * shape change is unacceptable. Every read is defensive: unparseable or structurally
 * wrong data is discarded in favour of a clean initial state rather than allowed to
 * crash the app on launch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/services/api/types';
import { INITIAL_STREAK } from './streak';
import type { AppState, OnboardingStep } from './types';

const STORAGE_KEY = 'futureos.state.v1';

/** Bump when the persisted shape changes, and add a migration below. */
export const SCHEMA_VERSION = 3;

export const INITIAL_STATE: AppState = {
  schemaVersion: SCHEMA_VERSION,
  auth: { phone: null, verified: false },
  onboardingStep: 'phone',
  profile: null,
  contributions: [],
  loans: [],
  streak: INITIAL_STREAK,
  dayOffset: 0,
  referralsAccepted: 0,
  onboarded: false,
};

/**
 * Structural validation.
 *
 * Deliberately checks shape rather than trusting `schemaVersion`, because the most
 * likely corruption — a partial write, or hand-edited storage — leaves the version
 * field intact while the rest is nonsense.
 */
function isValid(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<AppState>;
  return (
    typeof s.schemaVersion === 'number' &&
    typeof s.auth === 'object' &&
    s.auth !== null &&
    typeof s.onboardingStep === 'string' &&
    Array.isArray(s.contributions) &&
    Array.isArray(s.loans) &&
    typeof s.streak === 'object' &&
    s.streak !== null &&
    typeof s.dayOffset === 'number' &&
    typeof s.onboarded === 'boolean'
  );
}

/**
 * Upgrades older payloads in place. Runs oldest-first so an old blob can climb through
 * every intermediate version, so a shape change never forces a wipe.
 */
function migrate(state: AppState): AppState {
  let next = state;

  // v2 folded the standalone gender screen into the details step. Anyone stored mid-flow
  // on the retired step would otherwise fall through the boot gate's default and be sent
  // back to the very first screen with a verified number already in hand.
  if (next.schemaVersion < 2) {
    const retired = next.onboardingStep as OnboardingStep | 'gender';
    if (retired === 'gender') next = { ...next, onboardingStep: 'details' };
  }

  // v3 added referrals. Backfilled rather than left undefined, because the reward ladder
  // does arithmetic on it and `undefined + 1` renders as NaN on a rewards screen.
  if (next.schemaVersion < 3 || typeof next.referralsAccepted !== 'number') {
    next = { ...next, referralsAccepted: 0 };
  }

  return { ...next, schemaVersion: SCHEMA_VERSION };
}

export async function loadState(): Promise<AppState> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    throw new ApiError('storage', 'Could not read from device storage', error);
  }

  // First launch — an empty store is a normal state, not a failure.
  if (!raw) return INITIAL_STATE;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) throw new Error('shape mismatch');
    return migrate(parsed);
  } catch {
    // Corrupt payload. Starting clean beats crash-looping on every launch; the user
    // loses history but keeps a working app.
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return INITIAL_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Most likely a full device. Surfaced as an ApiError so the UI can tell the user
    // their action did not stick, rather than silently pretending it did.
    throw new ApiError('storage', 'Could not save to device storage', error);
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    throw new ApiError('storage', 'Could not clear device storage', error);
  }
}
