/**
 * Wealth Time Machine store.
 *
 * Same external-store shape as `future-store`: `useSyncExternalStore` with module-level
 * selectors, so a scrub that commits a year does not re-render the chart, the lever list
 * and the disclaimer. A second state library alongside it would buy identical semantics
 * and cost the codebase a second paradigm.
 *
 * The lifecycle is an explicit machine rather than a handful of booleans — `loading` and
 * `error` being independently true is not a state this feature has, and encoding that in
 * the type is what stops it happening.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

import type { Modifiers } from '@/lib/projection';
import {
  FIXTURE,
  OfflineError,
  commitSipChange,
  fetchPortfolio,
  makeIdempotencyKey,
  type PortfolioFixture,
} from '@/services/time-machine-api';

export type AssumedRate = 8 | 12 | 15;
export type LeverKey = 'sip+100' | 'skip3m' | 'withdraw50k';
export type Mode = 'single' | 'regret';

export type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'committing'
  | 'success'
  | 'error'
  | 'offline_queued';

export type QueuedCommit = {
  idempotencyKey: string;
  /** ISO. Rendered as a local time on the queued card. */
  savedAt: string;
  dailySip: number;
};

export type TimeMachineState = {
  selectedYear: number;
  assumedRate: AssumedRate;
  activeLever: LeverKey | null;
  mode: Mode;
  status: Status;
  queuedCommit: QueuedCommit | null;
  portfolio: PortfolioFixture;
  /** True once a fetch has succeeded, so offline can fall back to the last good data. */
  hydrated: boolean;
  /** ISO of the last successful fetch, for "Updated 12 minutes ago". */
  syncedAt: string | null;
  errorMessage: string | null;
};

/* ------------------------------------------------------------------ *
 * Levers
 * ------------------------------------------------------------------ */

export const LEVERS: {
  key: LeverKey;
  title: string;
  caption: string;
  variant: 'positive' | 'negative';
  modifiers: Modifiers;
}[] = [
  {
    key: 'sip+100',
    title: 'Add ₹100 / day',
    caption: 'SIP becomes ₹200/day',
    variant: 'positive',
    modifiers: { sipDelta: 100 },
  },
  {
    key: 'skip3m',
    title: 'Skip 3 months',
    caption: 'Pause your SIP',
    variant: 'negative',
    modifiers: { skipMonths: 3 },
  },
  {
    key: 'withdraw50k',
    title: 'Withdraw ₹50,000',
    caption: 'Sell units today',
    variant: 'negative',
    modifiers: { withdrawAmount: 50_000 },
  },
];

export function modifiersFor(lever: LeverKey | null): Modifiers | undefined {
  return LEVERS.find((l) => l.key === lever)?.modifiers;
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'futureos.timemachine.v1';

const INITIAL: TimeMachineState = {
  selectedYear: 2036,
  assumedRate: 12,
  activeLever: null,
  mode: 'single',
  status: 'idle',
  queuedCommit: null,
  portfolio: FIXTURE,
  hydrated: false,
  syncedAt: null,
  errorMessage: null,
};

let snapshot: TimeMachineState = INITIAL;
const listeners = new Set<() => void>();

function set(patch: Partial<TimeMachineState>): void {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): TimeMachineState {
  return snapshot;
}

/** Only the user's own choices survive a relaunch. Status is always re-derived. */
type Persisted = Pick<TimeMachineState, 'selectedYear' | 'assumedRate' | 'queuedCommit'>;

async function persist(): Promise<void> {
  const payload: Persisted = {
    selectedYear: snapshot.selectedYear,
    assumedRate: snapshot.assumedRate,
    queuedCommit: snapshot.queuedCommit,
  };
  // A failed write must not take the screen down; the user loses a preference, not data.
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

function isRate(n: unknown): n is AssumedRate {
  return n === 8 || n === 12 || n === 15;
}

export const timeMachine = {
  /** idle → loading → ready | error | offline_queued */
  async load(): Promise<void> {
    if (snapshot.status === 'loading') return;
    set({ status: 'loading', errorMessage: null });

    // Preferences first, so the restored year is already in place when data lands and the
    // scrubber does not visibly jump from 2036 to wherever the user left it.
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        set({
          selectedYear:
            typeof parsed.selectedYear === 'number' ? parsed.selectedYear : snapshot.selectedYear,
          assumedRate: isRate(parsed.assumedRate) ? parsed.assumedRate : snapshot.assumedRate,
          queuedCommit: parsed.queuedCommit ?? null,
        });
      }
    } catch {
      // Corrupt preferences are not worth a failure state — defaults are perfectly usable.
    }

    try {
      const portfolio = await fetchPortfolio();
      set({
        portfolio,
        status: 'ready',
        hydrated: true,
        syncedAt: new Date().toISOString(),
        errorMessage: null,
      });
      void timeMachine.drainQueue();
    } catch (error) {
      if (error instanceof OfflineError) {
        set({ status: 'offline_queued', errorMessage: null });
        return;
      }
      set({
        status: 'error',
        errorMessage: 'market-data-unavailable',
      });
    }
  },

  /** Gesture-end only. Scrubbing itself never touches this. */
  setSelectedYear(year: number): void {
    if (year === snapshot.selectedYear) return;
    set({ selectedYear: year });
    void persist();
  },

  setAssumedRate(rate: AssumedRate): void {
    if (rate === snapshot.assumedRate) return;
    set({ assumedRate: rate });
    void persist();
  },

  /** ready ↔ lever_preview. Tapping the active lever clears it. */
  toggleLever(lever: LeverKey): void {
    set({ activeLever: snapshot.activeLever === lever ? null : lever });
  },

  clearLevers(): void {
    set({ activeLever: null });
  },

  setMode(mode: Mode): void {
    if (mode !== snapshot.mode) set({ mode });
  },

  /**
   * lever_preview → committing → success | error | offline_queued
   *
   * The key is minted before the request and reused on retry, so a lost response cannot
   * turn one SIP change into two.
   */
  async commit(newDailySip: number): Promise<boolean> {
    if (snapshot.status === 'committing') return false;

    const idempotencyKey = snapshot.queuedCommit?.idempotencyKey ?? makeIdempotencyKey();
    set({ status: 'committing', errorMessage: null });

    try {
      await commitSipChange({ newDailySip, idempotencyKey });
      set({
        status: 'success',
        queuedCommit: null,
        portfolio: { ...snapshot.portfolio, dailySip: newDailySip },
      });
      void persist();
      return true;
    } catch (error) {
      if (error instanceof OfflineError) {
        set({
          status: 'offline_queued',
          queuedCommit: {
            idempotencyKey,
            savedAt: new Date().toISOString(),
            dailySip: newDailySip,
          },
        });
        void persist();
        return false;
      }
      set({ status: 'error', errorMessage: 'commit-failed' });
      return false;
    }
  },

  /** Sends a queued change once the network is back. Safe to call repeatedly. */
  async drainQueue(): Promise<void> {
    const queued = snapshot.queuedCommit;
    if (!queued) return;
    try {
      await commitSipChange({
        newDailySip: queued.dailySip,
        idempotencyKey: queued.idempotencyKey,
      });
      set({
        queuedCommit: null,
        portfolio: { ...snapshot.portfolio, dailySip: queued.dailySip },
      });
      void persist();
    } catch {
      // Still unreachable. The card stays; nothing is lost and nothing is sent twice.
    }
  },

  cancelQueued(): void {
    set({ queuedCommit: null, status: snapshot.hydrated ? 'ready' : 'idle' });
    void persist();
  },

  /** success → ready, on leaving the success screen. */
  acknowledgeSuccess(): void {
    if (snapshot.status === 'success') set({ status: 'ready', activeLever: null });
  },

  /** error → loading, via an actual re-fetch rather than a cosmetic reset. */
  async retry(): Promise<void> {
    set({ status: 'idle', errorMessage: null });
    await timeMachine.load();
  },

  /** Test and dev-menu seam. */
  reset(): void {
    snapshot = INITIAL;
    for (const listener of listeners) listener();
  },
};

export function useTimeMachine<T>(selector: (state: TimeMachineState) => T): T {
  return useSyncExternalStore(
    subscribe,
    useCallback(() => selector(getSnapshot()), [selector]),
  );
}

/** Module-level so identities are stable across renders. */
export const pick = {
  selectedYear: (s: TimeMachineState) => s.selectedYear,
  assumedRate: (s: TimeMachineState) => s.assumedRate,
  activeLever: (s: TimeMachineState) => s.activeLever,
  mode: (s: TimeMachineState) => s.mode,
  status: (s: TimeMachineState) => s.status,
  queuedCommit: (s: TimeMachineState) => s.queuedCommit,
  portfolio: (s: TimeMachineState) => s.portfolio,
  syncedAt: (s: TimeMachineState) => s.syncedAt,
  errorMessage: (s: TimeMachineState) => s.errorMessage,
} as const;
