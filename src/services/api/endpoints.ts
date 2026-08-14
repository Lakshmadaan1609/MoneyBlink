/**
 * Endpoints.
 *
 * Each function reads like a call to a real backend — it validates input, performs the
 * work, persists, and returns a typed payload — but resolves against local storage and
 * the simulation engine. Screens never touch storage or the simulation directly, so
 * pointing these at HTTP later is a change confined to this file.
 */

import {
  MAX_DAILY_AMOUNT,
  MIN_DAILY_AMOUNT,
  comparePaths,
  currentDay,
  project,
  snapshot,
} from "@/domain/simulation";
import {
  INITIAL_STATE,
  clearState,
  loadState,
  saveState,
} from "@/domain/storage";
import { applyContribution, reconcile } from "@/domain/streak";
import type {
  AppState,
  Contribution,
  Gender,
  Loan,
  MilestoneDay,
  PortfolioSnapshot,
  Purpose,
} from "@/domain/types";
import {
  MOCK_OTP,
  OTP_LENGTH,
  digitsOnly,
  validateAge,
  validateName,
  validateOtp,
  validatePhone,
} from "@/domain/validation";
import { request, type RequestOptions } from "./client";
import { ApiError } from "./types";

/** Ids are only ever local, so a counter plus timestamp is sufficient and stable. */
let sequence = 0;
function makeId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence}`;
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

export type SessionPayload = {
  state: AppState;
  today: number;
  portfolio: PortfolioSnapshot;
  /** Streak was found broken while the app was closed. */
  streakBroken: boolean;
  shieldsSpent: number;
};

/**
 * Boot. Loads persisted state and brings the streak up to date, since days pass while
 * the app is closed and the user must see that the moment they open it.
 */
export async function getSession(
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "getSession",
    async () => {
      const state = await loadState();
      const today = currentDay(state.dayOffset);
      const { streak, shieldsSpent, broken } = reconcile(state.streak, today);

      const next = broken || shieldsSpent > 0 ? { ...state, streak } : state;
      if (next !== state) await saveState(next);

      return {
        state: next,
        today,
        portfolio: snapshot(next.contributions, next.loans, today),
        streakBroken: broken,
        shieldsSpent,
      };
    },
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Authentication
 * ------------------------------------------------------------------ */

/** Helper: persist a patch and return the standard session payload. */
async function commit(
  patch: (state: AppState) => AppState,
): Promise<SessionPayload> {
  const state = await loadState();
  const next = patch(state);
  await saveState(next);
  const today = currentDay(next.dayOffset);
  return {
    state: next,
    today,
    portfolio: snapshot(next.contributions, next.loans, today),
    streakBroken: false,
    shieldsSpent: 0,
  };
}

export type OtpChallenge = {
  phone: string;
  /** How many digits the UI should collect. */
  length: number;
  /**
   * The code itself. A real backend would never return this — it is here because the
   * mock has no SMS channel, and the sign-in screen surfaces it as a visible hint so
   * the flow is testable on any device.
   */
  devCode: string;
  /** Seconds before "Resend" becomes available. */
  resendIn: number;
  /**
   * The updated session.
   *
   * Carried alongside the challenge so the caller can fold the newly-stored phone
   * number into the in-memory store. Without it the number lives only on disk, and the
   * next screen — which guards on `auth.phone` — would bounce the user straight back.
   */
  session: SessionPayload;
};

/** Step 1 — submit a mobile number and request a code. */
export async function requestOtp(
  phone: string,
  options?: RequestOptions,
): Promise<OtpChallenge> {
  return request(
    "requestOtp",
    async () => {
      const check = validatePhone(phone);
      if (!check.valid) throw new ApiError("validation", check.reason);

      const digits = digitsOnly(phone);
      const session = await commit((state) => ({
        ...state,
        auth: { phone: digits, verified: false },
        onboardingStep: "otp",
      }));

      return {
        phone: digits,
        length: OTP_LENGTH,
        devCode: MOCK_OTP,
        resendIn: 30,
        session,
      };
    },
    options,
  );
}

/** Step 2 — verify the code. Wrong codes are a validation error, never retryable. */
export async function verifyOtp(
  code: string,
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "verifyOtp",
    async () => {
      const check = validateOtp(code);
      if (!check.valid) throw new ApiError("validation", check.reason);

      const state = await loadState();
      // Guard against reaching this screen without a number — a deep link, or storage
      // cleared mid-flow.
      if (!state.auth.phone) {
        throw new ApiError("validation", "Enter your mobile number first");
      }

      return commit((s) => ({
        ...s,
        auth: { ...s.auth, verified: true },
        onboardingStep: "details",
      }));
    },
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

/**
 * Step 3 — name, age and gender. The last step of sign-up.
 *
 * Gender is validated here rather than trusted from the UI, because the character it
 * selects is read by every later screen: an unrecognised value would resolve to missing
 * artwork long after the mistake was made.
 */
export async function saveDetails(
  details: { name: string; age: number; gender: Gender },
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "saveDetails",
    async () => {
      const nameCheck = validateName(details.name);
      if (!nameCheck.valid) throw new ApiError("validation", nameCheck.reason);
      const ageCheck = validateAge(String(details.age));
      if (!ageCheck.valid) throw new ApiError("validation", ageCheck.reason);
      if (details.gender !== "male" && details.gender !== "female") {
        throw new ApiError("validation", "Choose your gender to continue");
      }

      return commit((state) => ({
        ...state,
        profile: {
          dailyAmount: state.profile?.dailyAmount ?? MIN_DAILY_AMOUNT,
          startedDay: state.profile?.startedDay ?? currentDay(state.dayOffset),
          ...state.profile,
          name: details.name.trim(),
          age: details.age,
          gender: details.gender,
        },
        // Sign-up is finished, but the story still has to run before the user reaches
        // the product — `onboarded` flips only once Chapter 1 is answered.
        onboardingStep: "story",
      }));
    },
    options,
  );
}

/**
 * Chapter 1 — records why the user is building wealth, and completes onboarding.
 *
 * This answer is the emotional anchor the rest of the product refers back to, so it is
 * persisted on the profile rather than held as transient story state.
 */
export async function savePurpose(
  purpose: Purpose,
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "savePurpose",
    async () => {
      const state = await loadState();
      if (!state.profile)
        throw new ApiError("validation", "Complete your profile first");

      return commit((s) => ({
        ...s,
        profile: { ...s.profile!, purpose },
        onboardingStep: "done",
        onboarded: true,
      }));
    },
    options,
  );
}

/** Sets the daily contribution, used by the story flow that follows sign-up. */
export async function setDailyAmount(
  amount: number,
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "setDailyAmount",
    async () => {
      if (amount < MIN_DAILY_AMOUNT || amount > MAX_DAILY_AMOUNT) {
        throw new ApiError(
          "validation",
          `Daily amount must be between ₹${MIN_DAILY_AMOUNT} and ₹${MAX_DAILY_AMOUNT}`,
        );
      }
      const state = await loadState();
      if (!state.profile)
        throw new ApiError("validation", "Complete your profile first");
      return commit((s) => ({
        ...s,
        profile: { ...s.profile!, dailyAmount: amount },
      }));
    },
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Referrals
 * ------------------------------------------------------------------ */

/**
 * Records an accepted invite.
 *
 * Stands in for the webhook a real backend would fire when an invited number completes
 * sign-up. Exposed to the UI as a demo control rather than hidden, because a referral
 * ladder with no way to advance it is a screen nobody can review.
 */
export async function recordReferral(
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "recordReferral",
    async () =>
      commit((state) => ({
        ...state,
        referralsAccepted: state.referralsAccepted + 1,
      })),
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Contributions
 * ------------------------------------------------------------------ */

export type ContributionPayload = SessionPayload & {
  milestoneReached: MilestoneDay | null;
  /** Today's contribution had already been made — nothing changed. */
  duplicate: boolean;
  shieldEarned: boolean;
};

/**
 * The daily action that drives the streak.
 *
 * Idempotent per day: a double tap, or a second contribution the same day, adds money
 * but never inflates the streak.
 */
export async function postContribution(
  amount: number,
  options?: RequestOptions,
): Promise<ContributionPayload> {
  return request(
    "postContribution",
    async () => {
      if (!Number.isFinite(amount) || amount < MIN_DAILY_AMOUNT) {
        throw new ApiError(
          "validation",
          `Minimum contribution is ₹${MIN_DAILY_AMOUNT}`,
        );
      }

      const state = await loadState();
      const today = currentDay(state.dayOffset);
      const outcome = applyContribution(state.streak, today);

      const contribution: Contribution = {
        id: makeId("c"),
        day: today,
        amount,
        at: new Date().toISOString(),
      };

      const next: AppState = {
        ...state,
        contributions: [...state.contributions, contribution],
        streak: outcome.streak,
      };
      await saveState(next);

      return {
        state: next,
        today,
        portfolio: snapshot(next.contributions, next.loans, today),
        streakBroken: outcome.broken,
        shieldsSpent: outcome.shieldsSpent,
        milestoneReached: outcome.milestoneReached,
        duplicate: outcome.duplicate,
        shieldEarned: outcome.shieldEarned,
      };
    },
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Break Glass
 * ------------------------------------------------------------------ */

/** Read-only projection of both paths. Safe to call on every slider tick. */
export async function getPathComparison(
  amount: number,
  years = 10,
  options?: RequestOptions,
): Promise<ReturnType<typeof comparePaths>> {
  return request(
    "getPathComparison",
    async () => {
      const state = await loadState();
      const today = currentDay(state.dayOffset);
      const portfolio = snapshot(state.contributions, state.loans, today);
      const daily = state.profile?.dailyAmount ?? MIN_DAILY_AMOUNT;
      return comparePaths(amount, portfolio, daily, years);
    },
    options,
  );
}

/**
 * Borrow against the portfolio — the path that keeps compounding intact.
 * Rejects anything above the 50% LTV cap with a distinct, non-retryable error.
 */
export async function postBorrow(
  amount: number,
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "postBorrow",
    async () => {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError("validation", "Enter an amount greater than ₹0");
      }

      const state = await loadState();
      const today = currentDay(state.dayOffset);
      const portfolio = snapshot(state.contributions, state.loans, today);

      if (amount > portfolio.availableToBorrow) {
        throw new ApiError(
          "limit_exceeded",
          "That is above your borrowing limit",
          {
            requested: amount,
            available: portfolio.availableToBorrow,
          },
        );
      }

      const loan: Loan = {
        id: makeId("l"),
        principal: amount,
        outstanding: amount,
        day: today,
        at: new Date().toISOString(),
      };

      // Note what is deliberately absent: the streak and the contribution ledger are
      // untouched. Borrowing costs interest, never progress.
      const next: AppState = { ...state, loans: [...state.loans, loan] };
      await saveState(next);

      return {
        state: next,
        today,
        portfolio: snapshot(next.contributions, next.loans, today),
        streakBroken: false,
        shieldsSpent: 0,
      };
    },
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Projections
 * ------------------------------------------------------------------ */

export type ProjectionPayload = { years: number; value: number }[];

/** Projection curve for the onboarding slider and the Future You screen. */
export async function getProjection(
  dailyAmount: number,
  horizons: number[] = [1, 3, 5, 10, 20],
  options?: RequestOptions,
): Promise<ProjectionPayload> {
  return request(
    "getProjection",
    async () => {
      const state = await loadState();
      const today = currentDay(state.dayOffset);
      const portfolio = snapshot(state.contributions, state.loans, today);
      return horizons.map((years) => ({
        years,
        value: project(portfolio.value, dailyAmount, years),
      }));
    },
    options,
  );
}

/* ------------------------------------------------------------------ *
 * Demo controls
 * ------------------------------------------------------------------ */

/**
 * Time travel. Milestones at 30, 100 and 365 days are otherwise impossible to show in
 * a review session, which would make three of four features invisible.
 */
export async function setDayOffset(
  offset: number,
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "setDayOffset",
    async () => {
      const state = await loadState();
      const next: AppState = {
        ...state,
        dayOffset: Math.max(0, Math.round(offset)),
      };
      await saveState(next);

      const today = currentDay(next.dayOffset);
      const { streak, shieldsSpent, broken } = reconcile(next.streak, today);
      const settled: AppState = { ...next, streak };
      await saveState(settled);

      return {
        state: settled,
        today,
        portfolio: snapshot(settled.contributions, settled.loans, today),
        streakBroken: broken,
        shieldsSpent,
      };
    },
    options,
  );
}

/** Wipes everything — used to demonstrate the first-run and empty states. */
export async function resetAll(
  options?: RequestOptions,
): Promise<SessionPayload> {
  return request(
    "resetAll",
    async () => {
      await clearState();
      const today = currentDay(0);
      return {
        state: INITIAL_STATE,
        today,
        portfolio: snapshot([], [], today),
        streakBroken: false,
        shieldsSpent: 0,
      };
    },
    options,
  );
}
