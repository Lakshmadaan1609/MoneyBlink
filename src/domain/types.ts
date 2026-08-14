/**
 * Domain model for FutureOS.
 *
 * Dates are stored as a **local day index** — whole days since the Unix epoch in the
 * device's own timezone — never as timestamps. A streak is a human, calendar-day
 * concept: "did I invest today?" must mean the same thing at 00:05 and 23:55, and must
 * survive the user flying between timezones. Comparing raw timestamps gets this wrong
 * in every one of those cases.
 */

export type Gender = 'male' | 'female';

/**
 * Why the user is building wealth.
 *
 * Chosen in Chapter 1 of the story. This is the emotional anchor the whole product
 * leans on later — Break Glass asks "do you want to stop building this?" and needs a
 * concrete answer to name.
 */
export type Purpose = 'parents' | 'family' | 'home' | 'freedom' | 'unsure';

export type GoalKey = 'home' | 'car' | 'emergency' | 'family' | 'freedom';

export type Contribution = {
  id: string;
  /** Local day index the money went in. */
  day: number;
  amount: number;
  /** ISO timestamp, retained for display and audit only — never for day maths. */
  at: string;
};

export type Loan = {
  id: string;
  /** Principal borrowed, in rupees. */
  principal: number;
  /** Principal still outstanding after any repayments. */
  outstanding: number;
  day: number;
  at: string;
};

export type Profile = {
  name: string;
  age: number;
  gender: Gender;
  /** Chosen later in the story flow; the floor is MIN_DAILY_AMOUNT. */
  dailyAmount: number;
  /** Local day index the journey began. */
  startedDay: number;
  /** Set during the story onboarding that follows sign-up. */
  purpose?: Purpose;
  goal?: GoalKey;
};

/**
 * Where the user has reached in sign-up.
 *
 * Persisted so an abandoned onboarding resumes exactly where it stopped rather than
 * restarting — losing a verified phone number because the app was backgrounded is the
 * fastest way to lose the user before they ever see the product.
 */
export type OnboardingStep = 'phone' | 'otp' | 'details' | 'story' | 'done';

export type AuthState = {
  /** Ten digits, no country code. Null until entered. */
  phone: string | null;
  /** True once the OTP has been accepted. */
  verified: boolean;
};

export type MilestoneDay = 7 | 30 | 100 | 365;

export type StreakState = {
  current: number;
  longest: number;
  /**
   * Earned consistency insurance. One shield is granted every 7 unbroken days (capped
   * at MAX_SHIELDS) and is spent automatically to cover a single missed day.
   */
  shields: number;
  /** Local day index of the most recent contribution, or null before the first. */
  lastContributionDay: number | null;
  /** Milestones already celebrated, so a celebration never fires twice. */
  milestonesReached: MilestoneDay[];
};

/** The complete persisted state. */
export type AppState = {
  schemaVersion: number;
  auth: AuthState;
  /** How far sign-up has progressed. */
  onboardingStep: OnboardingStep;
  /** Null until the details step completes. */
  profile: Profile | null;
  contributions: Contribution[];
  loans: Loan[];
  streak: StreakState;
  /**
   * Demo time travel: days added to the real clock. Lets a reviewer reach the 365-day
   * milestone in seconds instead of a year. Persisted so the simulated date survives
   * a relaunch.
   */
  dayOffset: number;
  /**
   * Invites that have been accepted. A count rather than a list because the product
   * never needs to name who joined — only how many, for the reward ladder.
   */
  referralsAccepted: number;
  /** True once onboarding has been completed. */
  onboarded: boolean;
};

/** A derived, read-only view of the portfolio. Never persisted. */
export type PortfolioSnapshot = {
  /** Sum of every contribution, ignoring growth. */
  invested: number;
  /** Present value including simulated compounding. */
  value: number;
  /** value - invested. */
  returns: number;
  /** Total principal still owed. */
  outstanding: number;
  /** Interest accrued to date on outstanding loans. */
  interestAccrued: number;
  /** How much more can still be borrowed under the LTV cap. */
  availableToBorrow: number;
  /** outstanding / value, 0 when nothing is owed. */
  ltv: number;
};
