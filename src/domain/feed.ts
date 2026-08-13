/**
 * Today's update.
 *
 * The feed is derived data, not presentation: every line is computed here from state the
 * app already holds, so the screen renders and nothing else. That keeps the numbers
 * testable and stops copy and arithmetic drifting apart, which is exactly how a fintech
 * ends up cheerfully reporting growth on an empty portfolio.
 */

// Explicit `.ts` extension: this is a *value* import, and `npm test` runs the domain
// under plain Node, whose ESM resolver will not guess one. Type-only imports elsewhere
// are erased before resolution, which is why they get away without it.
import { ASSUMED_MONTHLY_EXPENSE, compound } from './simulation.ts';
import type { Contribution, PortfolioSnapshot, Purpose, StreakState } from './types';

export type FeedItemKey = 'growth' | 'streak' | 'goal' | 'safety';

export type FeedItem = {
  key: FeedItemKey;
  title: string;
  /** The second line, carrying the number that makes the title worth reading. */
  detail: string;
  /** Revealed when the row is opened — the "why", not a restatement of the title. */
  expanded: string;
  /** Label for the row's action. */
  action: string;
};

/**
 * What each purpose from Chapter 1 is actually worth aiming at.
 *
 * Coarse on purpose: these are the round numbers people already carry in their heads,
 * not a financial plan. The point is to turn "my parents" into a bar that moves.
 */
const GOALS: Record<Purpose, { name: string; target: number }> = {
  parents: { name: 'Parents’ safety net', target: 10_00_000 },
  family: { name: 'Family future fund', target: 25_00_000 },
  home: { name: 'Dream home', target: 50_00_000 },
  freedom: { name: 'Financial freedom', target: 1_00_00_000 },
  unsure: { name: 'Your first ₹1 lakh', target: 1_00_000 },
};

/**
 * Where a streak sits against everyone else.
 *
 * Mock cohort data — there is no backend to ask, and inventing a precise figure per user
 * would be worse than a documented band. The shape is drawn from published habit-app
 * retention curves: the drop-off between day 1 and day 7 is brutal, and past 100 days
 * almost nobody is left.
 */
export function cohortPercentile(streakDays: number): number {
  if (streakDays >= 365) return 1;
  if (streakDays >= 100) return 2;
  if (streakDays >= 60) return 4;
  if (streakDays >= 30) return 8;
  if (streakDays >= 14) return 15;
  if (streakDays >= 7) return 24;
  if (streakDays >= 3) return 41;
  if (streakDays >= 1) return 62;
  return 100;
}

export type FeedInput = {
  portfolio: PortfolioSnapshot;
  contributions: readonly Contribution[];
  streak: StreakState;
  today: number;
  purpose?: Purpose;
};

/**
 * Growth booked since yesterday — the compounding you can actually see happening.
 *
 * Measured per contribution across a one-day step, and only for money that was already
 * in yesterday. Today's own deposit is capital moved, not money earned, so it books no
 * growth on its first day.
 *
 * Not written as `value(today) - value(yesterday)`: `compound` floors negative day
 * counts at the principal, so yesterday's valuation silently includes today's deposit at
 * face value, and the two ends of the subtraction cancel it out to nothing.
 */
export function growthToday(contributions: readonly Contribution[], today: number): number {
  let growth = 0;
  for (const c of contributions) {
    if (c.day >= today) continue;
    growth += compound(c.amount, today - c.day) - compound(c.amount, today - 1 - c.day);
  }
  return Math.max(0, growth);
}

export function buildFeed({
  portfolio,
  contributions,
  streak,
  today,
  purpose,
}: FeedInput): FeedItem[] {
  const started = portfolio.invested > 0;
  const growth = growthToday(contributions, today);
  const goal = GOALS[purpose ?? 'unsure'];
  const funded = goal.target > 0 ? (portfolio.value / goal.target) * 100 : 0;
  const months = portfolio.availableToBorrow / ASSUMED_MONTHLY_EXPENSE;
  const percentile = cohortPercentile(streak.current);

  return [
    {
      key: 'growth',
      title: started ? 'Your investments grew' : 'Your future is waiting to start',
      detail: started
        ? `₹${Math.round(growth).toLocaleString('en-IN')} today`
        : 'Nothing invested yet',
      expanded: started
        ? 'Every rupee already in keeps earning while you sleep, at 15% a year compounded daily. This is the part that does not require you to do anything.'
        : 'Your first contribution starts the compounding. From ₹21, today is the earliest it can begin.',
      action: started ? 'Invest again' : 'Make your first investment',
    },
    {
      key: 'streak',
      title:
        streak.current > 0
          ? `${streak.current} day streak continues!`
          : 'Your streak starts today',
      detail:
        streak.current > 0
          ? `You're in the top ${percentile}% of users`
          : 'One contribution begins it',
      expanded:
        streak.current > 0
          ? `Consistency is the only input you control. ${streak.shields} shield${streak.shields === 1 ? '' : 's'} in hand, and your longest run so far is ${streak.longest} days.`
          : 'A streak is consecutive days with a contribution. Miss a full day and it resets — but a shield will cover one slip once you have earned it.',
      action: 'Open your streak',
    },
    {
      key: 'goal',
      title: `${goal.name} is now`,
      detail: `${funded.toFixed(1)}% funded`,
      expanded: `Measured against ₹${goal.target.toLocaleString('en-IN')}, the target behind the answer you gave in Chapter 1. At today's pace this bar only moves one way.`,
      action: 'See the projection',
    },
    {
      key: 'safety',
      title:
        months >= 0.1
          ? 'Emergency fund can now'
          : 'Your emergency cover starts building',
      detail:
        months >= 0.1
          ? `protect you for ${months.toFixed(1)} months`
          : 'Invest to unlock instant cash',
      expanded: `Borrowing against your portfolio gives you cash without selling it, so it keeps compounding. Cover assumes ₹${ASSUMED_MONTHLY_EXPENSE.toLocaleString('en-IN')} a month — a stated assumption, not your real spending.`,
      action: 'See borrowing limit',
    },
  ];
}
