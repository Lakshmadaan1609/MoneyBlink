/**
 * Domain test suite.
 *
 * Runs on Node's native TypeScript stripping — no test framework, no build step:
 *   npm test
 *
 * Covers the pure logic that the UI cannot be trusted to exercise: calendar maths,
 * streak transitions, compounding, and every input rule. These are the parts where a
 * silent mistake produces a plausible-looking wrong number.
 */

import { formatCompactINR, formatINR, groupIndian } from '../src/lib/format.ts';
import {
  INITIAL_STREAK,
  REWARDS,
  activeReward,
  applyContribution,
  hasContributedToday,
  isAtRisk,
  milestoneProgress,
  nextMilestone,
  reconcile,
  rewardStatus,
} from '../src/domain/streak.ts';
import {
  availableToBorrow,
  comparePaths,
  compound,
  dateFromDayIndex,
  dayIndex,
  project,
  snapshot,
  startOfWeek,
  weekdayIndex,
} from '../src/domain/simulation.ts';
import {
  bindingConstraint,
  nextStage,
  stageFor,
  stageProgress,
} from '../src/domain/evolution.ts';
import { buildFeed, cohortPercentile, growthToday } from '../src/domain/feed.ts';
import {
  nextTier,
  referralCode,
  shareMessage,
  tierProgress,
} from '../src/domain/referral.ts';
import {
  HASHTAG,
  cardFilename,
  milestoneCaption,
  milestoneCard,
} from '../src/domain/share.ts';
import {
  MOCK_OTP,
  digitsOnly,
  firstName,
  formatPhone,
  validateAge,
  validateName,
  validateOtp,
  validatePhone,
} from '../src/domain/validation.ts';
// Layout tokens are plain arithmetic with no imports of their own, so the responsive
// sizing rules are unit-testable in exactly the same way the domain is.
import { Layout, contentInset, contentWidth } from '../src/theme/spacing.ts';

let failures = 0;

function check(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.log(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
    failures++;
  }
}

function ok(name: string, cond: boolean, detail = '') {
  if (!cond) {
    console.log(`FAIL ${name} ${detail}`);
    failures++;
  }
}

/* ---------------- currency formatting ---------------- */

for (const [n, want] of [
  [0, '0'], [999, '999'], [1000, '1,000'], [12345, '12,345'],
  [123456, '1,23,456'], [1234567, '12,34,567'], [12345678, '1,23,45,678'],
  [123456789, '12,34,56,789'], [-123456, '-1,23,456'],
] as [number, string][]) {
  check(`groupIndian(${n})`, groupIndian(n), want);
}
check('formatINR(21)', formatINR(21), '₹21');
check('formatINR lakh', formatINR(1234567), '₹12,34,567');
check('NaN guard', formatINR(NaN), '₹0');
check('Infinity guard', formatCompactINR(Infinity), '₹0');

/* ---------------- calendar ---------------- */

const today = dayIndex();
check('dayIndex roundtrip', dayIndex(dateFromDayIndex(today)), today);
ok('dayIndex is an integer', Number.isInteger(today));

const lateNight = new Date();
lateNight.setHours(23, 59, 0, 0);
const earlyNext = new Date(lateNight.getTime() + 2 * 60_000);
ok(
  'midnight splits calendar days',
  dayIndex(earlyNext) === dayIndex(lateNight) + 1,
  `${dayIndex(lateNight)} vs ${dayIndex(earlyNext)}`,
);

/* ---------------- streak ---------------- */

let s = INITIAL_STREAK;
check('first contribution starts at 1', applyContribution(s, 100).streak.current, 1);

let milestone7: unknown = null;
for (let d = 0; d < 7; d++) {
  const out = applyContribution(s, 100 + d);
  s = out.streak;
  if (out.milestoneReached) milestone7 = out.milestoneReached;
}
check('seven consecutive days', s.current, 7);
check('milestone 7 fires', milestone7, 7);
check('shield earned at 7', s.shields, 1);

const dup = applyContribution(s, 106);
ok('same-day contribution is a no-op', dup.duplicate && dup.streak.current === 7);

ok('alive the day after', !reconcile(s, 107).broken);
ok('at risk once a day has passed', isAtRisk(s, 107));
ok('not at risk on the same day', !isAtRisk(s, 106));
ok('hasContributedToday', hasContributedToday(s, 106));

const missedOne = reconcile(s, 108);
ok('one missed day is absorbed by a shield', !missedOne.broken);
check('shield spent', missedOne.shieldsSpent, 1);
check('shields remaining', missedOne.streak.shields, 0);
check('streak survives the gap', missedOne.streak.current, 7);

const missedMany = reconcile(s, 112);
ok('breaks when shields run out', missedMany.broken);
check('current resets to zero', missedMany.streak.current, 0);
check('longest is preserved', missedMany.streak.longest, 7);

const rebuilt = applyContribution(missedMany.streak, 112);
check('rebuild starts at 1', rebuilt.streak.current, 1);
ok('milestone does not refire on rebuild', rebuilt.milestoneReached === null);

const backwards = reconcile(s, 90);
ok('a backwards clock cannot break the streak', !backwards.broken && backwards.streak.current === 7);

check('nextMilestone(0)', nextMilestone(0), 7);
check('nextMilestone(7)', nextMilestone(7), 30);
check('nextMilestone(365)', nextMilestone(365), null);

/* ---------------- simulation ---------------- */

ok('compound over zero days is identity', compound(1000, 0) === 1000);
ok('365 days at 15% ≈ +15%', Math.abs(compound(1000, 365) - 1150) < 1, String(compound(1000, 365)));
ok('projection grows with time', project(10000, 21, 10) > project(10000, 21, 1));
ok('projection grows with contribution', project(0, 500, 10) > project(0, 21, 10));
ok('₹21/day for 10y lands near ₹1.67L', Math.abs(project(0, 21, 10) - 166996) < 50);
check('negative borrowing capacity clamps to 0', availableToBorrow(1000, 900), 0);
check('LTV ceiling is 50%', availableToBorrow(1000, 0), 500);

const contributions = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  day: today - 30 + i,
  amount: 21,
  at: new Date().toISOString(),
}));
const snap = snapshot(contributions, [], today);
check('invested equals 30 x 21', snap.invested, 630);
ok('value exceeds invested after growth', snap.value >= snap.invested);
ok('no debt means zero LTV', snap.ltv === 0);

const cmp = comparePaths(5000, { ...snap, value: 20000, availableToBorrow: 10000 }, 21, 10);
ok('borrowing beats selling on future value', cmp.borrowProjection > cmp.sellProjection);
ok('within the limit at 5k of 10k capacity', cmp.withinLimit);
ok(
  'over the limit is flagged',
  !comparePaths(50000, { ...snap, value: 20000, availableToBorrow: 10000 }, 21, 10).withinLimit,
);

/* ---------------- sign-up validation ---------------- */

const valid = (r: { valid: boolean }) => r.valid;

ok('rejects an empty phone', !valid(validatePhone('')));
ok('rejects nine digits', !valid(validatePhone('987654321')));
ok('accepts ten digits starting 9', valid(validatePhone('9876543210')));
ok('accepts ten digits starting 6', valid(validatePhone('6000000001')));
ok('rejects a leading 5', !valid(validatePhone('5876543210')));
ok('rejects a repeated digit', !valid(validatePhone('9999999999')));
ok('ignores spaces', valid(validatePhone('98765 43210')));
ok('rejects eleven digits', !valid(validatePhone('98765432101')));
check('formatPhone groups 5+5', formatPhone('9876543210'), '98765 43210');
check('formatPhone leaves partials alone', formatPhone('987'), '987');
check('digitsOnly strips punctuation', digitsOnly('+91 98-765'), '9198765');

ok('rejects an empty code', !valid(validateOtp('')));
ok('rejects a short code', !valid(validateOtp('11')));
ok('rejects the wrong code', !valid(validateOtp('1234')));
ok('accepts the mock code', valid(validateOtp(MOCK_OTP)));

ok('rejects an empty name', !valid(validateName('')));
ok('rejects a single character', !valid(validateName('A')));
ok('accepts a plain name', valid(validateName('Laksh')));
ok('accepts two words', valid(validateName('Ankita Agarwal')));
// Devanagari builds vowels from combining marks, so \p{L} alone is not enough.
ok('accepts a Devanagari name', valid(validateName('अंकिता')));
ok('accepts a Tamil name', valid(validateName('அங்கிதா')));
ok('accepts an apostrophe', valid(validateName("D'Souza")));
ok('rejects digits in a name', !valid(validateName('User123')));
ok('rejects an over-long name', !valid(validateName('a'.repeat(41))));
check('firstName trims and takes the first word', firstName('  Ankita  Agarwal '), 'Ankita');

ok('rejects an empty age', !valid(validateAge('')));
ok('rejects 17', !valid(validateAge('17')));
ok('accepts 18', valid(validateAge('18')));
ok('accepts 65', valid(validateAge('65')));
ok('rejects 101', !valid(validateAge('101')));
ok('rejects 0', !valid(validateAge('0')));

/* ---------------- week alignment ---------------- */

// Day 0 of the epoch, 1 Jan 1970, was a Thursday. Every other assertion here hangs off
// that fact, so it is asserted directly rather than assumed.
check('epoch day 0 is Thursday', dateFromDayIndex(0).getDay(), 4);
check('weekdayIndex(0) is Thursday', weekdayIndex(0), 3);
check('weekdayIndex(4) is Monday', weekdayIndex(4), 0);
check('weekdayIndex(10) is Sunday', weekdayIndex(10), 6);
check('weekdayIndex(11) wraps to Monday', weekdayIndex(11), 0);

// A negative index cannot arise from the real clock, but time travel and a hand-edited
// store both can produce one, and JS `%` returns a negative for negative operands.
check('weekdayIndex survives a negative day', weekdayIndex(-1), 2);
ok('weekdayIndex is always 0-6', [-30, -1, 0, 1, 19_000, 20_000].every((d) => {
  const i = weekdayIndex(d);
  return Number.isInteger(i) && i >= 0 && i <= 6;
}));

check('startOfWeek of a Monday is itself', startOfWeek(4), 4);
check('startOfWeek of a Sunday looks back six', startOfWeek(10), 4);
for (const day of [4, 7, 10, 11, 19_000, 20_123]) {
  ok(`startOfWeek(${day}) lands on a Monday`, weekdayIndex(startOfWeek(day)) === 0);
  ok(`startOfWeek(${day}) is never in the future`, startOfWeek(day) <= day);
  ok(`startOfWeek(${day}) is within six days`, day - startOfWeek(day) <= 6);
}

// The whole week must be contiguous — this is what the strip renders.
check(
  'a week spans seven consecutive days',
  Array.from({ length: 7 }, (_, i) => weekdayIndex(startOfWeek(20_123) + i)),
  [0, 1, 2, 3, 4, 5, 6],
);

/* ---------------- rewards ---------------- */

check('reward ladder matches the milestones', REWARDS.map((r) => r.day), [7, 30, 100, 365]);
check('a fresh user is working toward 7 days', activeReward(INITIAL_STREAK)?.day, 7);

const afterSeven = { ...INITIAL_STREAK, current: 9, milestonesReached: [7 as const] };
check('7 reads as claimed once reached', rewardStatus(REWARDS[0]!, afterSeven), 'claimed');
check('30 becomes the active rung', rewardStatus(REWARDS[1]!, afterSeven), 'active');
check('100 stays locked behind it', rewardStatus(REWARDS[2]!, afterSeven), 'locked');

// The case that motivated deriving status from history rather than from `current`: a
// streak that broke and rebuilt past a milestone it never actually crossed still owes it.
const rebuiltPastSeven = { ...INITIAL_STREAK, current: 45, longest: 45, milestonesReached: [] };
check('a skipped milestone is still owed', activeReward(rebuiltPastSeven)?.day, 7);
check('and a claimed one never re-locks', rewardStatus(REWARDS[0]!, afterSeven), 'claimed');

// All four earned: nothing left to work toward, and the ring reads as complete.
const complete = { ...INITIAL_STREAK, current: 400, milestonesReached: [7, 30, 100, 365] as const };
check('nothing is active once all are earned', activeReward({ ...complete, milestonesReached: [...complete.milestonesReached] }), null);
check('progress is 1 past the last milestone', milestoneProgress(400), 1);
check('progress is 0 at a milestone boundary', milestoneProgress(30), 0);
ok('progress stays within 0-1', [0, 1, 6, 7, 29, 99, 364, 365, 9999].every((d) => {
  const p = milestoneProgress(d);
  return p >= 0 && p <= 1;
}));

/* ---------------- evolution stages ---------------- */

check('a brand new user is at the first stage', stageFor(0, 0).key, 'starting');
check('a week and ₹500 unlocks building', stageFor(7, 500).key, 'building');

// The gate that matters: both bars, never one. Buying your way up must not work, and
// neither must showing up with nothing.
check('money without the habit does not advance', stageFor(0, 5_00_000).key, 'starting');
check('the habit without money does not advance', stageFor(400, 100).key, 'starting');
check('one bar short still holds you back', stageFor(100, 49_999).key, 'compounding');
check('clearing both advances', stageFor(100, 50_000).key, 'free');
check('the top stage needs a full year', stageFor(365, 2_00_000).key, 'founder');

check('nothing follows the last stage', nextStage(stageFor(365, 2_00_000)), null);
check('progress is 1 at the top', stageProgress(365, 2_00_000), 1);

// Progress reports the *binding* axis, not an average: 200 days with ₹300 is blocked on
// money, and saying "halfway there" would point the user at the wrong thing.
ok('progress follows the weaker axis', stageProgress(29, 500) < 0.2, `${stageProgress(29, 500)}`);
check('and names which axis it is', bindingConstraint(29, 500), 'invested');
check('the other way round too', bindingConstraint(7, 4_900), 'streak');
check('nothing binds at the top', bindingConstraint(365, 2_00_000), null);
ok('stage progress stays within 0-1', [0, 7, 30, 100, 365, 9999].every((d) =>
  [0, 500, 5_000, 50_000, 9_00_000].every((v) => {
    const p = stageProgress(d, v);
    return p >= 0 && p <= 1;
  }),
));

/* ---------------- today's feed ---------------- */

const feedDay = 20_000;
const feedContributions = [
  { id: 'a', day: feedDay - 400, amount: 10_000, at: '' },
  { id: 'b', day: feedDay, amount: 21, at: '' },
];
const feedPortfolio = snapshot(feedContributions, [], feedDay);

// Today's own deposit is capital moved, not money earned. Counting it as growth would
// report ₹21 of "growth" on a day the portfolio only grew by pennies.
const growth = growthToday(feedContributions, feedDay);
ok('growth excludes today’s own contribution', growth < 21, `${growth}`);
ok('growth is positive on a funded portfolio', growth > 0, `${growth}`);
check('growth is never negative', growthToday([], feedDay), 0);

const feed = buildFeed({
  portfolio: feedPortfolio,
  contributions: feedContributions,
  streak: { ...INITIAL_STREAK, current: 47, longest: 47, shields: 2 },
  today: feedDay,
  purpose: 'home',
});
check('the feed has four rows', feed.length, 4);
check('rows are in a fixed order', feed.map((f) => f.key), ['growth', 'streak', 'goal', 'safety']);
ok('the streak row names the streak', feed[1]!.title.includes('47'));
ok('the goal row names the Chapter 1 answer', feed[2]!.title.includes('Dream home'));

// An empty portfolio must not be congratulated on growth it did not have.
const emptyFeed = buildFeed({
  portfolio: snapshot([], [], feedDay),
  contributions: [],
  streak: INITIAL_STREAK,
  today: feedDay,
});
ok('an empty portfolio gets an invitation, not a boast', !emptyFeed[0]!.title.includes('grew'));
ok('and a zero streak is not "continuing"', !emptyFeed[1]!.title.includes('continues'));
check('every row always has an action', feed.every((f) => f.action.length > 0), true);

check('a dead streak is the whole cohort', cohortPercentile(0), 100);
check('a year puts you at the top', cohortPercentile(365), 1);
ok('percentile only improves with days', [0, 1, 3, 7, 14, 30, 60, 100, 365].every((d, i, all) =>
  i === 0 || cohortPercentile(d) <= cohortPercentile(all[i - 1]!),
));

/* ---------------- referrals ---------------- */

// The one property that matters: a code must never change for the same number, or a
// friend types one that was already given away to somebody else.
check('a code is stable', referralCode('9876543210'), referralCode('9876543210'));
check('a code is six characters', referralCode('9876543210').length, 6);
ok('a code has no ambiguous glyphs',
  !/[O0I1]/.test(referralCode('9876543210')), referralCode('9876543210'));
ok('formatting does not change the code',
  referralCode('+91 98765 43210') === referralCode('9876543210'));

// Most of a user base shares a prefix, so adjacent numbers must not collide.
const codes = new Set(
  Array.from({ length: 500 }, (_, i) => referralCode(String(9000000000 + i))),
);
ok('adjacent numbers rarely collide', codes.size >= 495, `${codes.size}/500 distinct`);
ok('a missing number still yields a code', referralCode(null).length === 6);

check('a new user is working toward one friend', nextTier(0)?.count, 1);
check('one accepted moves to the next rung', nextTier(1)?.count, 3);
check('nothing left after five', nextTier(5), null);
check('progress is 1 once the ladder is done', tierProgress(5), 1);
check('progress is 0 at a rung boundary', tierProgress(1), 0);
ok('progress stays within 0-1', [0, 1, 2, 3, 4, 5, 99].every((n) => {
  const p = tierProgress(n);
  return p >= 0 && p <= 1;
}));

// The share message leads with the streak, because that is the part that persuades.
const shared = shareMessage({ name: 'Laksh', streakDays: 47, code: 'ABC123' });
ok('the message leads with the streak', shared.startsWith("I've invested every day for 47 days"));
ok('and still carries the code', shared.includes('ABC123'));
ok('and is signed', shared.includes('Laksh'));

const coldShare = shareMessage({ streakDays: 0, code: 'ABC123' });
ok('a zero streak is not claimed as one', !coldShare.includes('0 days'));
ok('but the invite still works', coldShare.includes('ABC123'));

/* ---------------- milestone card ---------------- */

// The card is the whole artefact: a screenshot forwarded without its caption still has
// to state the claim, name the product, and explain the mechanism.
const card47 = milestoneCard(47);
check('the card names the streak', card47.value, '47 days');
ok('and names the product', card47.trail.includes('BlinkMoney'));
ok('and explains the mechanism', card47.body.includes('Liquid Wealth Account'));
ok('and quotes both rates', card47.body.includes('15%') && card47.body.includes('9.99%'));

// A "0 day streak" card is a scoreboard saying nothing. Day one is a different message.
const card0 = milestoneCard(0);
ok('a zero streak gets its own card', card0.lead.includes('just started'));
ok('and never claims zero days', !`${card0.lead}${card0.value}${card0.trail}`.includes('0 days'));
ok('but still explains the product', card0.body === card47.body);

const caption = milestoneCaption({ streakDays: 47, phone: '9876543210', name: 'Laksh' });
ok('the caption leads with the streak', caption.startsWith('47 days of investing'));
ok('and carries the invite code', caption.includes(referralCode('9876543210')));
ok('and the hashtag', caption.includes(HASHTAG));
ok('and is signed', caption.includes('Laksh'));

const coldCaption = milestoneCaption({ streakDays: 0, phone: null });
ok('a cold caption still invites', coldCaption.includes(referralCode(null)));
ok('and does not boast about zero', !coldCaption.includes('0 days'));

check('a filename is stable per streak', cardFilename(47), 'blinkmoney-streak-47.png');
check('and survives a negative', cardFilename(-3), 'blinkmoney-streak-0.png');

/* ---------------- responsive layout ---------------- */

// The bug this locks: `Screen` pads the viewport and *then* caps the padded box, so the
// cap has to apply to the already-padded width. Capping first and subtracting padding
// afterwards is right only while the viewport is narrower than the cap — on a desktop
// browser it returned 512 for a box that was actually 560, and a permanent slice of the
// next hero slide sat in view.
for (const [viewport, want] of [
  [320, 272], // small phone — below the cap, so padding is the only reduction
  [390, 342], // typical phone
  [560, 512], // exactly the cap, still padding-bound
  [608, 560], // the crossover: padded width first reaches the cap
  [1024, 560], // tablet — capped
  [1917, 560], // desktop browser — capped, and the case that was wrong
] as [number, number][]) {
  check(`contentWidth(${viewport})`, contentWidth(viewport), want);
}

ok(
  'content width never exceeds the readable cap',
  [320, 390, 560, 768, 1024, 1440, 1917, 3840].every((w) => contentWidth(w) <= Layout.maxContentWidth),
);
ok(
  'content width never exceeds the viewport it sits in',
  [320, 390, 560, 768, 1024, 1440, 1917, 3840].every((w) => contentWidth(w) <= w),
);
ok(
  'content width only grows with the viewport',
  [320, 390, 560, 608, 1024, 1917].every((w, i, all) =>
    i === 0 ? true : contentWidth(w) >= contentWidth(all[i - 1]!),
  ),
);

// A menu anchored to the window has to be inset by this to stay attached to the column
// its trigger lives in. On a phone the two are the same number; on desktop they are not.
check('contentInset on a phone equals the gutter', contentInset(390), Layout.screenPadding);
check('contentInset on desktop reaches the column edge', contentInset(1917), (1917 - 560) / 2);
ok(
  'an anchored panel always lands inside the viewport',
  [320, 390, 768, 1917].every((w) => contentInset(w) * 2 + contentWidth(w) <= w + 0.5),
);

/* ---------------- summary ---------------- */

console.log(`break-glass delta over 10y on ₹5,000: ${formatCompactINR(cmp.futureDifference)}`);
console.log(failures === 0 ? '\n✅ ALL TESTS PASS' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
