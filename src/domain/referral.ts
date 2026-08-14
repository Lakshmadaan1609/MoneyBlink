/**
 * Referrals.
 *
 * The referral loop is the streak's loop pointed outward: you share proof of a habit you
 * are proud of, and the reward for being early is the same reward for staying. Pure
 * functions over a phone number and a count, so every tier boundary is testable.
 */

// Relative with an explicit extension, not the `@/` alias: `npm test` runs the domain
// under plain Node, which resolves neither. The whole domain layer stays alias-free so it
// remains testable without a bundler.
import { pluralDays } from '../lib/format.ts';

export type ReferralTier = {
  /** Accepted invites needed. */
  count: number;
  title: string;
  reward: string;
};

/**
 * The ladder.
 *
 * Deliberately shallow — three rungs, the first at a single friend. A programme whose
 * first reward needs five invites reads as something for other people.
 */
export const REFERRAL_TIERS: readonly ReferralTier[] = [
  { count: 1, title: 'First friend', reward: '₹100 into your portfolio' },
  { count: 3, title: 'Three friends', reward: '₹500 + a permanent streak shield' },
  { count: 5, title: 'Five friends', reward: '₹1,000 + Founder’s Circle access' },
] as const;

/** Ambiguous glyphs removed: nobody should have to guess O from 0 reading a code aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * A stable code for a phone number.
 *
 * Derived rather than stored so it survives a wiped cache and can never disagree with
 * itself across devices. A real build would mint this server-side; the property that
 * matters — same input, same code, forever — holds either way.
 */
export function referralCode(phone: string | null): string {
  // Normalised to the last ten digits before hashing, so a number stored as "9876543210"
  // and the same number stored as "+91 98765 43210" resolve to one code. A user whose
  // code changed because the storage format shifted would be handing out an invite that
  // silently belongs to nobody.
  const digits = (phone ?? '').replace(/\D/g, '');
  const seed = digits.slice(-10) || '0';

  // FNV-1a: short, dependency-free, and spreads adjacent phone numbers far apart, which
  // matters because most of a user base shares a prefix.
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[hash % ALPHABET.length];
    hash = Math.floor(hash / ALPHABET.length) + (i + 1) * 7919;
  }
  return code;
}

/** The tier being worked toward, or null once all are earned. */
export function nextTier(accepted: number): ReferralTier | null {
  return REFERRAL_TIERS.find((t) => t.count > accepted) ?? null;
}

/** Progress toward the next tier, 0–1. Returns 1 when the ladder is complete. */
export function tierProgress(accepted: number): number {
  const next = nextTier(accepted);
  if (!next) return 1;
  const previous = [...REFERRAL_TIERS].reverse().find((t) => t.count <= accepted)?.count ?? 0;
  const span = next.count - previous;
  return span <= 0 ? 1 : Math.max(0, Math.min(1, (accepted - previous) / span));
}

/**
 * The message that actually gets shared.
 *
 * Leads with the streak rather than the code, because "I've invested 47 days straight" is
 * a thing a person says and "use my referral code" is a thing an app says. The number is
 * the proof; the code is the footnote.
 */
export function shareMessage({
  name,
  streakDays,
  code,
}: {
  name?: string;
  streakDays: number;
  code: string;
}): string {
  const opener =
    streakDays > 0
      ? `I've invested every day for ${pluralDays(streakDays)} straight on BlinkMoney.`
      : `I've started investing on BlinkMoney — ₹21 a day, no income proof, no credit score.`;

  const who = name ? `\n\n— ${name}` : '';

  return (
    `${opener}\n\n` +
    `It's a Liquid Wealth Account: your money grows at ~15% p.a., and you can borrow ` +
    `against it at 9.99% without selling — so it keeps compounding either way.\n\n` +
    `Use my code ${code} when you join and we both get a reward.${who}`
  );
}
