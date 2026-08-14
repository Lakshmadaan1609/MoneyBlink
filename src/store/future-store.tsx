/**
 * Application store.
 *
 * Implemented as an external store read through `useSyncExternalStore` rather than a
 * plain Context value. With Context, every screen subscribed to the provider re-renders
 * on any change — so ticking the streak would also re-render the portfolio card, the
 * avatar and the projection. Here each component subscribes to just the slice it reads.
 *
 * Selector contract: a selector must return a **stable reference** — a primitive, or a
 * slice of state that keeps its identity when unchanged. Returning a freshly built
 * object (`s => ({ a, b })`) on every call would re-render forever.
 */

import { useCallback, useSyncExternalStore } from 'react';

import { INITIAL_STATE } from '@/domain/storage';
import { currentDay, snapshot } from '@/domain/simulation';
import type { AppState, Gender, MilestoneDay, PortfolioSnapshot, Purpose } from '@/domain/types';
import * as api from '@/services/api/endpoints';
import { ApiError, toApiError } from '@/services/api/types';

export type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * One-shot things the UI reacts to — a celebration, a broken streak — as opposed to
 * durable state. Consumed and cleared so a milestone cannot fire twice on re-render.
 */
export type FutureEvent =
  | { kind: 'milestone'; milestone: MilestoneDay }
  | { kind: 'streak-broken' }
  | { kind: 'shield-spent'; count: number }
  | { kind: 'shield-earned' }
  | { kind: 'invested'; amount: number }
  | { kind: 'borrowed'; amount: number }
  | { kind: 'duplicate' };

export type StoreState = {
  status: Status;
  /** Set while a mutation is in flight, so buttons can show a spinner. */
  mutating: boolean;
  error: ApiError | null;
  state: AppState;
  today: number;
  portfolio: PortfolioSnapshot;
  event: FutureEvent | null;
};

const initialToday = currentDay(0);

let snapshotState: StoreState = {
  status: 'idle',
  mutating: false,
  error: null,
  state: INITIAL_STATE,
  today: initialToday,
  portfolio: snapshot([], [], initialToday),
  event: null,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function set(patch: Partial<StoreState>): void {
  snapshotState = { ...snapshotState, ...patch };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  return snapshotState;
}

/** Folds an endpoint payload into the store. */
function applySession(payload: api.SessionPayload, event: FutureEvent | null = null): void {
  set({
    status: 'ready',
    mutating: false,
    error: null,
    state: payload.state,
    today: payload.today,
    portfolio: payload.portfolio,
    event: event ?? (payload.streakBroken ? { kind: 'streak-broken' } : null),
  });
}

function fail(error: unknown): void {
  set({ status: 'error', mutating: false, error: toApiError(error) });
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export const actions = {
  async hydrate(): Promise<void> {
    set({ status: 'loading', error: null });
    try {
      applySession(await api.getSession({ retries: 1 }));
    } catch (error) {
      fail(error);
    }
  },

  /**
   * Sign-up steps.
   *
   * Each returns a boolean rather than throwing, so a screen can simply `if (ok)
   * router.push(...)`. Failures land in `error` for the UI to render, and the screen
   * stays put — navigating forward on a failed step is how users end up in states the
   * backend never agreed to.
   */

  async requestOtp(phone: string): Promise<api.OtpChallenge | null> {
    set({ mutating: true, error: null });
    try {
      const challenge = await api.requestOtp(phone);
      // Fold the stored phone number into memory. Setting only `mutating: false` here
      // left `auth.phone` null in the store, so the OTP screen's guard fired and sent
      // the user straight back to this screen.
      applySession(challenge.session);
      return challenge;
    } catch (error) {
      fail(error);
      return null;
    }
  },

  async verifyOtp(code: string): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.verifyOtp(code));
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  async saveDetails(details: {
    name: string;
    age: number;
    gender: Gender;
  }): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.saveDetails(details));
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  async savePurpose(purpose: Purpose): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.savePurpose(purpose));
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  /** Sets the daily commitment the streak and every projection are measured against. */
  async setDailyAmount(amount: number): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.setDailyAmount(amount));
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  async contribute(amount: number): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      const payload = await api.postContribution(amount);
      // Milestone outranks the smaller acknowledgements — only one can be shown.
      const event: FutureEvent = payload.duplicate
        ? { kind: 'duplicate' }
        : payload.milestoneReached
          ? { kind: 'milestone', milestone: payload.milestoneReached }
          : payload.shieldEarned
            ? { kind: 'shield-earned' }
            : { kind: 'invested', amount };
      applySession(payload, event);
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  async borrow(amount: number): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.postBorrow(amount), { kind: 'borrowed', amount });
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  /** Demo control: stands in for the backend webhook when an invite is accepted. */
  async recordReferral(): Promise<boolean> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.recordReferral());
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  },

  async timeTravel(offset: number): Promise<void> {
    set({ mutating: true, error: null });
    try {
      applySession(await api.setDayOffset(offset));
    } catch (error) {
      fail(error);
    }
  },

  async reset(): Promise<void> {
    set({ status: 'loading', error: null });
    try {
      applySession(await api.resetAll());
    } catch (error) {
      fail(error);
    }
  },

  /** Clears a consumed one-shot event. */
  clearEvent(): void {
    if (snapshotState.event) set({ event: null });
  },

  /** Dismisses an error without retrying, returning the UI to its last good state. */
  clearError(): void {
    if (snapshotState.error) {
      set({ error: null, status: snapshotState.state.onboarded ? 'ready' : 'idle' });
    }
  },
};

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

/**
 * Subscribes to one slice of the store.
 * @see the selector contract in this file's header.
 */
export function useFuture<T>(selector: (state: StoreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    useCallback(() => selector(getSnapshot()), [selector]),
  );
}

/** Ready-made selectors — module-level so their identity is stable across renders. */
export const select = {
  status: (s: StoreState) => s.status,
  mutating: (s: StoreState) => s.mutating,
  error: (s: StoreState) => s.error,
  event: (s: StoreState) => s.event,
  today: (s: StoreState) => s.today,
  portfolio: (s: StoreState) => s.portfolio,
  profile: (s: StoreState) => s.state.profile,
  streak: (s: StoreState) => s.state.streak,
  contributions: (s: StoreState) => s.state.contributions,
  loans: (s: StoreState) => s.state.loans,
  onboarded: (s: StoreState) => s.state.onboarded,
  dayOffset: (s: StoreState) => s.state.dayOffset,
  auth: (s: StoreState) => s.state.auth,
  onboardingStep: (s: StoreState) => s.state.onboardingStep,
  referralsAccepted: (s: StoreState) => s.state.referralsAccepted,
} as const;

/** Escape hatch for the rare consumer that genuinely needs everything. */
export function useFutureStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
