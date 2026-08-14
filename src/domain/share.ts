/**
 * Milestone sharing.
 *
 * The card and the caption are two halves of one artefact: the image is what gets seen in
 * a group chat, and the caption is what makes it joinable. Both derive from the same
 * streak, so a screenshot can never claim a number the text contradicts.
 */

import { referralCode } from './referral.ts';
import { pluralDays } from '../lib/format.ts';

export const HASHTAG = '#FutureIsYours';

export type MilestoneCard = {
  /** Opening clause, up to the number. */
  lead: string;
  /** The number and its unit, emphasised inline. */
  value: string;
  /** Closing clause after the number. */
  trail: string;
  /** The explainer paragraph — what the reader is actually being invited into. */
  body: string;
  hashtag: string;
};

/**
 * What the card says.
 *
 * The card carries the whole message rather than a headline over a portrait, because a
 * screenshot forwarded into a group chat arrives with no caption attached. Everything
 * needed to understand the claim has to survive on the image alone.
 *
 * A zero streak gets a different card rather than a "0 day streak" — nobody shares a
 * scoreboard that says nothing, and pretending otherwise makes the surface feel automated.
 */
export function milestoneCard(streakDays: number): MilestoneCard {
  const body =
    'It’s a Liquid Wealth Account — your money grows at ~15% p.a., and you can ' +
    'borrow against it at 9.99% without selling. So it keeps compounding either way.';

  if (streakDays <= 0) {
    return {
      lead: 'I’ve just started investing on',
      value: 'BlinkMoney',
      trail: '— ₹21 a day, every day.',
      body,
      hashtag: HASHTAG,
    };
  }

  return {
    lead: 'I’ve invested every day for',
    value: pluralDays(streakDays),
    trail: 'straight on BlinkMoney.',
    body,
    hashtag: HASHTAG,
  };
}

/**
 * The caption that travels with the image.
 *
 * Deliberately shorter than the referral message in `./referral`: that one has to carry
 * the whole pitch on its own, whereas this one sits under a picture that has already
 * made the point. What it must not lose is the code — an image with no way to act on it
 * is a poster.
 */
export function milestoneCaption({
  streakDays,
  phone,
  name,
}: {
  streakDays: number;
  phone: string | null;
  name?: string;
}): string {
  const code = referralCode(phone);

  const opener =
    streakDays > 0
      ? `${pluralDays(streakDays)} of investing, without missing one.`
      : `Day one of investing on BlinkMoney.`;

  return (
    `${opener}\n\n` +
    `₹21 a day, growing at ~15% p.a. — and I can borrow against it at 9.99% ` +
    `without selling, so it keeps compounding either way.\n\n` +
    `Join me with code ${code} and we both get a reward.\n` +
    `${HASHTAG}${name ? `\n\n— ${name}` : ''}`
  );
}

/** Filename for a downloaded card. Stable per streak so re-saving does not litter. */
export function cardFilename(streakDays: number): string {
  return `blinkmoney-streak-${Math.max(0, Math.round(streakDays))}.png`;
}
