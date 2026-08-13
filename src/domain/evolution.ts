/**
 * Future You evolution.
 *
 * The character does not just change expression — they change *standing*. Stages are
 * gated on both consistency and capital, deliberately: money without the habit is luck,
 * and the habit without money is a hobby. Reaching a stage requires clearing both bars,
 * which is what stops someone buying their way to "Financially Free" with one deposit.
 *
 * Pure functions over two numbers, so every threshold is directly testable.
 */

export type StageKey = 'starting' | 'building' | 'compounding' | 'free' | 'founder';

export type Stage = {
  key: StageKey;
  /** Shown beside the projected age, e.g. "34 yrs old · Financially Free". */
  title: string;
  /** One line on what this stage means, for the stage detail. */
  tagline: string;
  minStreak: number;
  minInvested: number;
};

export const STAGES: readonly Stage[] = [
  {
    key: 'starting',
    title: 'Just Starting',
    tagline: 'The first rupee is the hardest. You have already put it in.',
    minStreak: 0,
    minInvested: 0,
  },
  {
    key: 'building',
    title: 'Building Momentum',
    tagline: 'A week unbroken. This is where most people stop — you did not.',
    minStreak: 7,
    minInvested: 500,
  },
  {
    key: 'compounding',
    title: 'Compounding',
    tagline: 'A month in. Growth has started doing work you did not have to do.',
    minStreak: 30,
    minInvested: 5_000,
  },
  {
    key: 'free',
    title: 'Financially Free',
    tagline: 'A hundred days and a real balance. You can borrow instead of break.',
    minStreak: 100,
    minInvested: 50_000,
  },
  {
    key: 'founder',
    title: 'Founder’s Circle',
    tagline: 'A full year without missing. Almost nobody gets here.',
    minStreak: 365,
    minInvested: 200_000,
  },
] as const;

/** The highest stage whose consistency *and* capital bars are both cleared. */
export function stageFor(streakDays: number, invested: number): Stage {
  let reached = STAGES[0]!;
  for (const stage of STAGES) {
    if (streakDays >= stage.minStreak && invested >= stage.minInvested) reached = stage;
  }
  return reached;
}

export function nextStage(current: Stage): Stage | null {
  const index = STAGES.findIndex((s) => s.key === current.key);
  return STAGES[index + 1] ?? null;
}

/**
 * Progress to the next stage, 0–1.
 *
 * The *lower* of the two axes, not the average: a user with 200 days and ₹300 is not
 * halfway to the next stage, they are blocked on money. Showing the binding constraint
 * is the only version of this number that tells them what to do next.
 */
export function stageProgress(streakDays: number, invested: number): number {
  const current = stageFor(streakDays, invested);
  const next = nextStage(current);
  if (!next) return 1;

  const streakSpan = next.minStreak - current.minStreak;
  const investedSpan = next.minInvested - current.minInvested;

  const streakPart =
    streakSpan <= 0 ? 1 : clamp01((streakDays - current.minStreak) / streakSpan);
  const investedPart =
    investedSpan <= 0 ? 1 : clamp01((invested - current.minInvested) / investedSpan);

  return Math.min(streakPart, investedPart);
}

/** Which of the two bars is holding the user back, for copy that names it. */
export function bindingConstraint(
  streakDays: number,
  invested: number,
): 'streak' | 'invested' | null {
  const current = stageFor(streakDays, invested);
  const next = nextStage(current);
  if (!next) return null;

  const streakShort = Math.max(0, next.minStreak - streakDays);
  const investedShort = Math.max(0, next.minInvested - invested);
  if (streakShort === 0 && investedShort === 0) return null;

  // Compared as fractions of each span, since days and rupees are not comparable units.
  const streakSpan = Math.max(1, next.minStreak - current.minStreak);
  const investedSpan = Math.max(1, next.minInvested - current.minInvested);
  return streakShort / streakSpan >= investedShort / investedSpan ? 'streak' : 'invested';
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
