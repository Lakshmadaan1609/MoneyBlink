/**
 * Wealth Time Machine projection engine.
 *
 * Pure: no React, no clock, no storage. Everything the Time Machine displays — every
 * hero figure, every lever delta, every point on the chart — comes out of this one
 * function, so a number can never appear on screen that the engine did not produce.
 *
 * Compounds monthly and emits yearly points. Monthly is the smallest step that matters
 * for a daily SIP: annual compounding would understate a contribution stream by treating
 * eleven months of deposits as if they arrived on New Year's Eve.
 */

export type Modifiers = {
  /** Rupees added to (or removed from) the daily SIP for the whole horizon. */
  sipDelta?: number;
  /** Consecutive months of SIP paused, starting immediately. */
  skipMonths?: number;
  /** One-off withdrawal taken today, before any compounding. */
  withdrawAmount?: number;
};

export type ProjectionInput = {
  currentValue: number;
  dailySip: number;
  annualRatePct: number;
  startYear: number;
  endYear: number;
  modifiers?: Modifiers;
};

export type ProjectionPoint = { year: number; value: number };

export type ProjectionResult = {
  points: ProjectionPoint[];
  summary: {
    /** Capital put in: what is already invested plus every future contribution. */
    invested: number;
    /** final − invested. Negative is possible after a large withdrawal. */
    growth: number;
    final: number;
  };
};

/** Average days per month over a 400-year cycle — the Gregorian calendar's real mean. */
const DAYS_PER_MONTH = 365.2425 / 12;

/** The six figures the milestone counter measures against, in rupees. */
export const MILESTONES = [1_00_000, 5_00_000, 10_00_000, 25_00_000, 50_00_000, 1_00_00_000];

/** How many milestones a value has passed. */
export function milestonesHit(value: number): number {
  let hit = 0;
  for (const m of MILESTONES) if (value >= m) hit += 1;
  return hit;
}

function safe(n: number | undefined, fallback = 0): number {
  return Number.isFinite(n) ? (n as number) : fallback;
}

/**
 * Runs the projection.
 *
 * Guards every input rather than trusting callers: a corrupted store, a lever applied to
 * an empty portfolio, or a withdrawal larger than the holdings must all produce a
 * sensible curve rather than `NaN`, which would render as a blank hero on a money screen.
 */
function compute(input: ProjectionInput): ProjectionResult {
  const currentValue = Math.max(0, safe(input.currentValue));
  const baseSip = Math.max(0, safe(input.dailySip));
  const ratePct = safe(input.annualRatePct);
  const startYear = Math.round(safe(input.startYear));
  const endYear = Math.round(safe(input.endYear));

  const sipDelta = safe(input.modifiers?.sipDelta);
  // A lever cannot drive the SIP below zero — that would be a withdrawal wearing a
  // contribution's clothes, and the invested total would start counting downwards.
  const dailySip = Math.max(0, baseSip + sipDelta);
  const skipMonths = Math.max(0, Math.round(safe(input.modifiers?.skipMonths)));
  const withdraw = Math.max(0, safe(input.modifiers?.withdrawAmount));

  const totalMonths = Math.max(0, (endYear - startYear) * 12);
  const monthlyRate = ratePct / 100 / 12;
  const monthlySip = dailySip * DAYS_PER_MONTH;

  // Selling comes out of the balance first, and cannot take more than is there.
  const withdrawn = Math.min(withdraw, currentValue);
  let balance = currentValue - withdrawn;

  // Invested is capital contributed, so a withdrawal reduces it: money taken back out was
  // never left in. Floored at zero so a full liquidation does not read as negative.
  let invested = Math.max(0, currentValue - withdrawn);

  const points: ProjectionPoint[] = [{ year: startYear, value: balance }];

  for (let month = 1; month <= totalMonths; month += 1) {
    // Growth first, then the deposit: a contribution made this month has not been
    // invested long enough to have earned anything yet.
    balance *= 1 + monthlyRate;

    if (month > skipMonths) {
      balance += monthlySip;
      invested += monthlySip;
    }

    if (month % 12 === 0) {
      points.push({ year: startYear + month / 12, value: balance });
    }
  }

  // A negative rate can drive the balance below zero over a long horizon; a portfolio
  // that owes money is not a thing this product models.
  const final = Math.max(0, balance);

  return {
    points: points.map((p) => ({ year: p.year, value: Math.max(0, p.value) })),
    summary: { invested, growth: final - invested, final },
  };
}

/* ------------------------------------------------------------------ *
 * Memoisation
 * ------------------------------------------------------------------ */

/** Bounded so a long scrubbing session cannot grow the cache without limit. */
const CACHE_LIMIT = 64;
const cache = new Map<string, ProjectionResult>();

function keyOf(input: ProjectionInput): string {
  const m = input.modifiers;
  return [
    input.currentValue,
    input.dailySip,
    input.annualRatePct,
    input.startYear,
    input.endYear,
    m?.sipDelta ?? 0,
    m?.skipMonths ?? 0,
    m?.withdrawAmount ?? 0,
  ].join('|');
}

/**
 * Memoised projection.
 *
 * Scrubbing changes only the *selected year*, not the curve, so the same series is asked
 * for on every frame of a drag. Recomputing 180 months per frame is exactly the kind of
 * work that turns a 60fps gesture into a 40fps one.
 */
export function computeSeries(input: ProjectionInput): ProjectionResult {
  const key = keyOf(input);
  const hit = cache.get(key);
  if (hit) return hit;

  const result = compute(input);

  // Insertion-ordered: the oldest key is the first one the iterator yields.
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, result);
  return result;
}

/** Test seam — the cache is module state and would otherwise leak between cases. */
export function clearProjectionCache(): void {
  cache.clear();
}

/** Value at a given year, linearly interpolated between the yearly points. */
export function valueAtYear(points: readonly ProjectionPoint[], year: number): number {
  if (points.length === 0) return 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (year <= first.year) return first.value;
  if (year >= last.year) return last.value;

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (year <= b.year) {
      const span = b.year - a.year;
      const t = span <= 0 ? 0 : (year - a.year) / span;
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}
