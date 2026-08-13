/**
 * Wealth Streak mechanics.
 *
 * The streak is the retention anchor, so its rules have to be predictable and
 * forgiving in the right places. Two ideas do the work:
 *
 *   1. A streak is alive if you contributed today *or* yesterday. It only dies once a
 *      full calendar day passes with nothing in it.
 *   2. Shields are earned consistency insurance — one per unbroken week, capped — and
 *      are spent automatically to absorb a missed day. Missing one day after weeks of
 *      effort should sting, not erase the effort.
 *
 * Every function here is pure and takes an explicit `today`, so the awkward cases
 * (missed days, double taps, time travel) are directly testable.
 */

import type { MilestoneDay, StreakState } from './types';

export const MILESTONES: readonly MilestoneDay[] = [7, 30, 100, 365] as const;

/** A shield is earned every this many unbroken days. */
export const SHIELD_INTERVAL = 7;
/** Holding more than two would make the streak feel meaningless. */
export const MAX_SHIELDS = 2;

export const INITIAL_STREAK: StreakState = {
  current: 0,
  longest: 0,
  shields: 0,
  lastContributionDay: null,
  milestonesReached: [],
};

export type StreakOutcome = {
  streak: StreakState;
  /** A milestone crossed on this contribution, if any. */
  milestoneReached: MilestoneDay | null;
  /** The user had already contributed today — nothing changed. */
  duplicate: boolean;
  /** Shields consumed to absorb missed days. */
  shieldsSpent: number;
  /** The streak was lost outright. */
  broken: boolean;
  /** A new shield was earned. */
  shieldEarned: boolean;
};

/**
 * Brings a streak up to date without contributing.
 *
 * Called whenever the app opens or the day rolls over, so a streak broken while the
 * app was closed is reflected immediately rather than only on the next contribution.
 */
export function reconcile(
  streak: StreakState,
  today: number,
): { streak: StreakState; shieldsSpent: number; broken: boolean } {
  const { lastContributionDay } = streak;

  // Nothing has ever been contributed, so there is nothing to lose.
  if (lastContributionDay === null) return { streak, shieldsSpent: 0, broken: false };

  // Guard against the device clock moving backwards (manual change, or travelling
  // west across a date line). Treat it as "no time passed" rather than punishing.
  if (today <= lastContributionDay) return { streak, shieldsSpent: 0, broken: false };

  // Contributed today or yesterday: still alive, nothing owed.
  const missedDays = today - lastContributionDay - 1;
  if (missedDays <= 0) return { streak, shieldsSpent: 0, broken: false };

  // Shields absorb whole missed days, oldest debt first.
  if (missedDays <= streak.shields) {
    return {
      streak: { ...streak, shields: streak.shields - missedDays },
      shieldsSpent: missedDays,
      broken: false,
    };
  }

  // Not enough cover: the streak is lost. Shields are spent in the attempt, and
  // `longest` is preserved because it is a record of what actually happened.
  return {
    streak: {
      ...streak,
      current: 0,
      shields: 0,
      longest: Math.max(streak.longest, streak.current),
    },
    shieldsSpent: streak.shields,
    broken: true,
  };
}

/**
 * Records a contribution for `today` and advances the streak.
 *
 * Reconciles first, so callers cannot forget to, and so a contribution made after a
 * gap lands on correctly-aged state.
 */
export function applyContribution(streak: StreakState, today: number): StreakOutcome {
  // Idempotent: a double tap, or two contributions in one day, must not inflate the
  // streak. The day is the unit, not the transaction.
  if (streak.lastContributionDay === today) {
    return {
      streak,
      milestoneReached: null,
      duplicate: true,
      shieldsSpent: 0,
      broken: false,
      shieldEarned: false,
    };
  }

  const { streak: reconciled, shieldsSpent, broken } = reconcile(streak, today);

  // A shielded gap continues the run; a break restarts it at day one.
  const current = broken ? 1 : reconciled.current + 1;

  let shields = reconciled.shields;
  let shieldEarned = false;
  if (current > 0 && current % SHIELD_INTERVAL === 0 && shields < MAX_SHIELDS) {
    shields += 1;
    shieldEarned = true;
  }

  // Only fire a milestone the first time it is crossed, so celebrations cannot repeat
  // after a break-and-rebuild.
  const milestoneReached =
    MILESTONES.find((m) => m === current && !reconciled.milestonesReached.includes(m)) ?? null;

  return {
    streak: {
      current,
      longest: Math.max(reconciled.longest, current),
      shields,
      lastContributionDay: today,
      milestonesReached: milestoneReached
        ? [...reconciled.milestonesReached, milestoneReached]
        : reconciled.milestonesReached,
    },
    milestoneReached,
    duplicate: false,
    shieldsSpent,
    broken,
    shieldEarned,
  };
}

/** Whether today's contribution has already been made. */
export function hasContributedToday(streak: StreakState, today: number): boolean {
  return streak.lastContributionDay === today;
}

/**
 * True when the streak survives only until the end of today — the user contributed
 * yesterday but not yet today. Drives the "don't lose it" nudge and the avatar's
 * worried expression.
 */
export function isAtRisk(streak: StreakState, today: number): boolean {
  return streak.current > 0 && streak.lastContributionDay === today - 1;
}

/** The next milestone still ahead, or null once all are behind. */
export function nextMilestone(current: number): MilestoneDay | null {
  return MILESTONES.find((m) => m > current) ?? null;
}

/** Progress toward the next milestone, 0–1. Returns 1 when all are complete. */
export function milestoneProgress(current: number): number {
  const next = nextMilestone(current);
  if (next === null) return 1;
  const previous = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const span = next - previous;
  return span <= 0 ? 1 : (current - previous) / span;
}

/* ------------------------------------------------------------------ *
 * Rewards
 * ------------------------------------------------------------------ */

export type Reward = {
  day: MilestoneDay;
  /** Cash value in rupees, or null for the milestones that pay in status instead. */
  amount: number | null;
  /** Shown in place of the amount when there is no cash figure. */
  label: string;
};

/**
 * What each milestone pays out.
 *
 * Data rather than copy baked into a component, so the ladder can be re-priced without
 * touching the screen. The last two deliberately pay in status rather than cash: past
 * a hundred days the streak is worth more as identity than as ₹200.
 */
export const REWARDS: readonly Reward[] = [
  { day: 7, amount: 200, label: '₹200 reward' },
  { day: 30, amount: 500, label: '₹500 reward' },
  { day: 100, amount: null, label: 'Special reward' },
  { day: 365, amount: null, label: 'Founder’s Circle' },
] as const;

export type RewardStatus = 'claimed' | 'active' | 'locked';

/**
 * The reward currently being worked toward: the lowest one not yet earned.
 *
 * Deliberately *not* derived from `current`. A streak that broke and rebuilt past a
 * milestone it never actually crossed still owes that milestone — driving this off
 * `current` would jump the user straight to the next tier and quietly skip a reward.
 */
export function activeReward(streak: StreakState): Reward | null {
  return REWARDS.find((r) => !streak.milestonesReached.includes(r.day)) ?? null;
}

/**
 * Where a given milestone stands.
 *
 * Reads `milestonesReached` rather than comparing against `current`, because a broken
 * streak resets `current` while the history of what was actually achieved survives — a
 * reward already earned must never re-lock.
 */
export function rewardStatus(reward: Reward, streak: StreakState): RewardStatus {
  if (streak.milestonesReached.includes(reward.day)) return 'claimed';
  return reward.day === activeReward(streak)?.day ? 'active' : 'locked';
}
