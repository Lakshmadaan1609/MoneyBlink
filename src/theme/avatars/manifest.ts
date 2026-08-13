/**
 * Future You avatar manifest.
 *
 * The supplied art ships twelve expressions per gender, with identical naming across
 * both sets, so a single key union covers everything. Expression is derived from app
 * state rather than set by hand at call sites — that is what keeps the avatar feeling
 * like a character reacting to your behaviour rather than decoration.
 */

/** Source order matches the numbering on the supplied expression sheets. */
export const EXPRESSIONS = [
  'happy',
  'laughing',
  'wink',
  'thinking',
  'surprised',
  'confident',
  'excited',
  'cool',
  'sad',
  'serious',
  'confused',
  'hello',
] as const;

export type ExpressionKey = (typeof EXPRESSIONS)[number];

export const GENDERS = ['male', 'female'] as const;
export type AvatarGender = (typeof GENDERS)[number];

/** Resting expression when nothing more specific applies. */
export const DEFAULT_EXPRESSION: ExpressionKey = 'happy';

/**
 * Inputs the avatar reacts to. Deliberately a plain snapshot rather than the whole
 * store, so `expressionForState` stays pure and unit-testable.
 */
export type AvatarState = {
  /** Current consecutive-day streak. */
  streak: number;
  /** Milestone reached on this exact render, if any. */
  milestoneReached?: 7 | 30 | 100 | 365 | null;
  /** Streak was broken and not saved by a shield. */
  streakBroken?: boolean;
  /** User is mid-decision on the Break Glass screen. */
  deciding?: boolean;
  /** User is previewing the consequences of selling. */
  previewingSell?: boolean;
  /** Today's contribution has just been confirmed. */
  investedToday?: boolean;
  /** First reveal of the long-term projection during onboarding. */
  firstProjection?: boolean;
  /** Onboarding greeting. */
  greeting?: boolean;
  /** Something failed — error or empty state. */
  errored?: boolean;
};

/**
 * Maps app state to an expression.
 *
 * Order matters: the earliest matching branch wins, so the list runs from most
 * situational (a one-off moment the user is looking at right now) to most ambient
 * (their general standing). Every one of the twelve expressions is reachable.
 */
export function expressionForState(state: AvatarState): ExpressionKey {
  const {
    streak,
    milestoneReached,
    streakBroken,
    deciding,
    previewingSell,
    investedToday,
    firstProjection,
    greeting,
    errored,
  } = state;

  if (greeting) return 'hello';
  if (errored) return 'confused';
  if (firstProjection) return 'surprised';

  // Break Glass: weighing the options, then reacting to the destructive one.
  if (previewingSell) return 'serious';
  if (deciding) return 'thinking';

  if (streakBroken) return 'sad';

  // Milestones escalate — the 365-day payoff gets the strongest reaction.
  if (milestoneReached === 365) return 'cool';
  if (milestoneReached === 100 || milestoneReached === 30) return 'laughing';
  if (milestoneReached === 7) return 'excited';

  if (investedToday) return 'wink';

  // Ambient standing, based purely on how deep the streak is.
  if (streak >= 100) return 'cool';
  if (streak >= 30) return 'confident';

  return DEFAULT_EXPRESSION;
}
