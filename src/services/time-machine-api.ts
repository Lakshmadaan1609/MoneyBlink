/**
 * Wealth Time Machine mock API.
 *
 * Reads like a network client — latency, failure, idempotency, an offline path — so the
 * loading, error and queued states are genuinely reachable rather than decorative. The
 * fixture is a fixed seed, not random: a demo that shows different numbers on each launch
 * is impossible to check against a design.
 */

export type PortfolioFixture = {
  currentValue: number;
  allTimeGain: number;
  allTimeGainPct: number;
  dailySip: number;
  invested: number;
  units: number;
  borrowable: number;
  /** First year on the timeline. */
  startYear: number;
  /** Last year on the timeline. */
  endYear: number;
  /** Age at `startYear`, so the eyebrow can say "age 34" at any scrub position. */
  ageAtStart: number;
};

/** The prototype's figures, to the rupee. */
export const FIXTURE: PortfolioFixture = {
  currentValue: 248_754,
  allTimeGain: 18_521,
  allTimeGainPct: 7.2,
  dailySip: 100,
  invested: 230_233,
  units: 1_184.62,
  borrowable: 174_127,
  startYear: 2026,
  endYear: 2041,
  ageAtStart: 24,
};

/* ------------------------------------------------------------------ *
 * Dev switches
 * ------------------------------------------------------------------ */

/** 0–1. Raise it to make `fetchPortfolio` fail on demand and show the error state. */
export let FAILURE_RATE = 0;
export function setFailureRate(rate: number): void {
  FAILURE_RATE = Math.max(0, Math.min(1, rate));
}

/** Stretches latency past any reasonable patience, to hold the skeleton on screen. */
export let simulateSlowNetwork = false;
export function setSlowNetwork(on: boolean): void {
  simulateSlowNetwork = on;
}

/** Forces the offline path without touching the device radio. */
export let simulateOffline = false;
export function setOffline(on: boolean): void {
  simulateOffline = on;
}

export class TimeMachineError extends Error {
  constructor(
    message: string,
    /** False for offline, so the UI can queue rather than ask the user to retry. */
    readonly retryable = true,
  ) {
    super(message);
    this.name = 'TimeMachineError';
  }
}

export class OfflineError extends TimeMachineError {
  constructor() {
    super('offline', false);
    this.name = 'OfflineError';
  }
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

/** Counter-driven, not random: the same call sequence produces the same latencies. */
let latencyTick = 0;

function nextLatency(): number {
  latencyTick += 1;
  if (simulateSlowNetwork) return 4_000 + (latencyTick % 3) * 700;
  // 600–1200ms, walked deterministically across the band.
  return 600 + (latencyTick % 7) * 100;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new TimeMachineError('aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new TimeMachineError('aborted'));
    });
  });
}

let failureTick = 0;

/** Deterministic within a session: every Nth call fails at the configured rate. */
function shouldFail(): boolean {
  if (FAILURE_RATE <= 0) return false;
  failureTick += 1;
  return failureTick * FAILURE_RATE >= 1 && failureTick % Math.ceil(1 / FAILURE_RATE) === 0;
}

export async function fetchPortfolio(signal?: AbortSignal): Promise<PortfolioFixture> {
  await wait(nextLatency(), signal);
  if (simulateOffline) throw new OfflineError();
  if (shouldFail()) throw new TimeMachineError('market-data-unavailable');
  return FIXTURE;
}

/* ------------------------------------------------------------------ *
 * Commit
 * ------------------------------------------------------------------ */

export type CommitResult = {
  dailySip: number;
  /** ISO timestamp the change was accepted. */
  acceptedAt: string;
  idempotencyKey: string;
};

/**
 * Accepted keys, so a retry after a timeout cannot double-submit.
 *
 * This is the whole reason the client sends a key rather than the server minting one: if
 * the response is lost, the client has no way to tell "never arrived" from "arrived and
 * the reply vanished", and a SIP change is not something to guess about.
 */
const accepted = new Map<string, CommitResult>();

export async function commitSipChange(
  input: { newDailySip: number; idempotencyKey: string },
  signal?: AbortSignal,
): Promise<CommitResult> {
  const existing = accepted.get(input.idempotencyKey);
  if (existing) return existing;

  await wait(nextLatency(), signal);

  if (simulateOffline) throw new OfflineError();
  if (shouldFail()) throw new TimeMachineError('commit-failed');
  if (!Number.isFinite(input.newDailySip) || input.newDailySip <= 0) {
    throw new TimeMachineError('invalid-amount', false);
  }

  const result: CommitResult = {
    dailySip: input.newDailySip,
    acceptedAt: new Date().toISOString(),
    idempotencyKey: input.idempotencyKey,
  };
  accepted.set(input.idempotencyKey, result);
  return result;
}

/** Whether a key has already been accepted — used when draining the offline queue. */
export function wasAccepted(idempotencyKey: string): boolean {
  return accepted.has(idempotencyKey);
}

/** Ids are local-only, so a counter plus a timestamp is stable and sufficient. */
let keySequence = 0;
export function makeIdempotencyKey(): string {
  keySequence += 1;
  return `sip_${Date.now().toString(36)}_${keySequence}`;
}
