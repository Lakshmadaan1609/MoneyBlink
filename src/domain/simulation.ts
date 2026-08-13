/**
 * The wealth simulation.
 *
 * Every number the UI shows is derived here from the contribution and loan ledgers, so
 * the portfolio, the projection and the Break Glass comparison can never disagree with
 * one another. Nothing is random: the same ledger always produces the same figures,
 * which is what lets a reviewer replay the demo and see identical results.
 *
 * Rates mirror BlinkMoney's published product terms.
 */

import type { Contribution, Loan, PortfolioSnapshot } from './types';

/** "Save @ 15% p.a." */
export const ANNUAL_RETURN = 0.15;
/** "Borrow @ 9.99% p.a." */
export const BORROW_RATE = 0.0999;
/** Loan-to-value ceiling. Borrowing stops here to keep the position safe. */
export const MAX_LTV = 0.5;
/** "Starts at ₹21/day" */
export const MIN_DAILY_AMOUNT = 21;
export const MAX_DAILY_AMOUNT = 500;

/**
 * Monthly outgoings assumed when expressing borrowing capacity as months of cover.
 *
 * A real build would ask, or infer it from bank data. Stated as a constant — and shown
 * to the user wherever the figure appears — because a "3.6 months of safety" number
 * pulled from an unstated assumption is the kind of thing people make decisions on.
 */
export const ASSUMED_MONTHLY_EXPENSE = 25_000;

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

/**
 * Whole days since the epoch **in local time**.
 *
 * `getTimezoneOffset` is applied before flooring so the boundary lands on local
 * midnight. Using UTC here would roll the streak over at 05:30 IST, and comparing
 * timestamps directly would make a 23:59 and a 00:01 contribution look like the same
 * day when they are not.
 */
export function dayIndex(date: Date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / DAY_MS);
}

/** Converts a local day index back to that day's local midnight. */
export function dateFromDayIndex(day: number): Date {
  const utc = new Date(day * DAY_MS);
  return new Date(utc.getTime() + utc.getTimezoneOffset() * 60_000);
}

/** Today's day index, shifted by the demo time-travel offset. */
export function currentDay(dayOffset = 0): number {
  return dayIndex() + dayOffset;
}

/**
 * Position in a Monday-first week, 0–6.
 *
 * Day 0 of the epoch was a Thursday, so the +3 rotates that origin onto Monday. Derived
 * arithmetically rather than via `Date.getDay()` because the whole streak model is day
 * indices — round-tripping through a Date here would reintroduce the timezone bug that
 * `dayIndex` exists to avoid.
 */
export function weekdayIndex(day: number): number {
  // `% 7` of a negative day index is negative in JS, so normalise before rotating.
  return ((((day % 7) + 7) % 7) + 3) % 7;
}

/** The Monday on or before `day`, as a day index. */
export function startOfWeek(day: number): number {
  return day - weekdayIndex(day);
}

/* ------------------------------------------------------------------ *
 * Growth
 * ------------------------------------------------------------------ */

/**
 * Compounds a single amount held for `days` at the annual rate.
 * Daily compounding keeps the number moving every single day, which is the entire
 * point of the product: compounding you can actually see.
 */
export function compound(amount: number, days: number, annualRate = ANNUAL_RETURN): number {
  if (days <= 0) return amount;
  return amount * Math.pow(1 + annualRate, days / 365);
}

/** Present value of the whole contribution ledger. */
export function portfolioValue(contributions: readonly Contribution[], today: number): number {
  let total = 0;
  for (const c of contributions) total += compound(c.amount, today - c.day);
  return total;
}

export function totalInvested(contributions: readonly Contribution[]): number {
  let total = 0;
  for (const c of contributions) total += c.amount;
  return total;
}

/**
 * Projects forward: today's holdings keep compounding while a daily contribution is
 * added on top. The daily leg is a standard future-value-of-an-annuity, evaluated per
 * day rather than per year so small amounts still show visible movement.
 */
export function project(
  presentValue: number,
  dailyAmount: number,
  years: number,
  annualRate = ANNUAL_RETURN,
): number {
  const days = Math.round(years * 365);
  if (days <= 0) return presentValue;

  const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1;
  const grown = presentValue * Math.pow(1 + dailyRate, days);

  // Guard the zero-rate case, where the annuity formula divides by zero.
  const contributed =
    dailyRate === 0
      ? dailyAmount * days
      : dailyAmount * ((Math.pow(1 + dailyRate, days) - 1) / dailyRate);

  return grown + contributed;
}

/* ------------------------------------------------------------------ *
 * Borrowing
 * ------------------------------------------------------------------ */

/** Simple interest accrued on a loan since it was taken. */
export function loanInterest(loan: Loan, today: number): number {
  const days = Math.max(0, today - loan.day);
  return loan.outstanding * BORROW_RATE * (days / 365);
}

export function totalOutstanding(loans: readonly Loan[]): number {
  let total = 0;
  for (const l of loans) total += l.outstanding;
  return total;
}

/**
 * How much more can be borrowed right now.
 *
 * Clamped at zero: if the portfolio falls after borrowing, the position can exceed the
 * LTV cap, and a negative capacity would otherwise render as a nonsensical offer.
 */
export function availableToBorrow(value: number, outstanding: number): number {
  return Math.max(0, value * MAX_LTV - outstanding);
}

/* ------------------------------------------------------------------ *
 * Snapshot
 * ------------------------------------------------------------------ */

export function snapshot(
  contributions: readonly Contribution[],
  loans: readonly Loan[],
  today: number,
): PortfolioSnapshot {
  const invested = totalInvested(contributions);
  const value = portfolioValue(contributions, today);
  const outstanding = totalOutstanding(loans);

  let interestAccrued = 0;
  for (const l of loans) interestAccrued += loanInterest(l, today);

  return {
    invested,
    value,
    returns: value - invested,
    outstanding,
    interestAccrued,
    availableToBorrow: availableToBorrow(value, outstanding),
    ltv: value > 0 ? outstanding / value : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Break Glass
 * ------------------------------------------------------------------ */

export type PathComparison = {
  amount: number;
  /** Projected value in `years` if the user sells to raise the cash. */
  sellProjection: number;
  /** Projected value in `years` if the user borrows against the portfolio instead. */
  borrowProjection: number;
  /** borrowProjection - sellProjection: the cost of selling, in future rupees. */
  futureDifference: number;
  /** Interest payable on the loan over the horizon. */
  interestCost: number;
  /** Whether the requested amount is within the LTV cap. */
  withinLimit: boolean;
};

/**
 * The heart of Break Glass: what selling actually costs versus borrowing.
 *
 * Selling removes capital permanently, so it stops compounding forever. Borrowing
 * leaves the portfolio intact and compounding, and costs only interest. Showing both
 * futures side by side in rupees is the whole persuasion.
 */
export function comparePaths(
  amount: number,
  portfolio: PortfolioSnapshot,
  dailyAmount: number,
  years = 10,
): PathComparison {
  const requested = Math.max(0, amount);

  // Selling: capital leaves the portfolio and never compounds again.
  const afterSale = Math.max(0, portfolio.value - requested);
  const sellProjection = project(afterSale, dailyAmount, years);

  // Borrowing: the portfolio is untouched and keeps compounding in full.
  const borrowProjection = project(portfolio.value, dailyAmount, years);

  const interestCost = requested * BORROW_RATE * years;

  return {
    amount: requested,
    sellProjection,
    borrowProjection,
    futureDifference: borrowProjection - sellProjection,
    interestCost,
    withinLimit: requested <= portfolio.availableToBorrow,
  };
}
