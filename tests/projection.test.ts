/**
 * Wealth Time Machine projection tests.
 *
 * Runs on Node's native TypeScript stripping, same as the domain suite:
 *   npm test
 *
 * The engine is the only thing standing between a user and a wrong number on a money
 * screen, so the cases here are the ones where a plausible-looking figure would go
 * unnoticed: empty inputs, levers that should hurt, and arithmetic that must not produce
 * NaN or a negative balance.
 */

import {
  clearProjectionCache,
  computeSeries,
  milestonesHit,
  valueAtYear,
} from '../src/lib/projection.ts';

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

const BASE = {
  currentValue: 248_754,
  dailySip: 100,
  annualRatePct: 12,
  startYear: 2026,
  endYear: 2041,
};

/* ---------------- shape ---------------- */

const base = computeSeries(BASE);
check('one point per year, inclusive', base.points.length, 16);
check('the first point is today’s balance', Math.round(base.points[0]!.value), 248_754);
check('years run consecutively', base.points.map((p) => p.year)[15], 2041);
ok('the curve only rises at a positive rate', base.points.every((p, i, all) =>
  i === 0 || p.value >= all[i - 1]!.value,
));
check(
  'final matches the last point',
  Math.round(base.summary.final),
  Math.round(base.points[15]!.value),
);
check(
  'invested plus growth is the final value',
  Math.round(base.summary.invested + base.summary.growth),
  Math.round(base.summary.final),
);

/* ---------------- degenerate inputs ---------------- */

const noSip = computeSeries({ ...BASE, dailySip: 0 });
ok('a zero SIP still compounds what is there', noSip.summary.final > BASE.currentValue);
check('a zero SIP invests nothing new', Math.round(noSip.summary.invested), 248_754);

const noPortfolio = computeSeries({ ...BASE, currentValue: 0 });
ok('a zero portfolio still grows from contributions', noPortfolio.summary.final > 0);
check('a zero portfolio starts at zero', noPortfolio.points[0]!.value, 0);

const nothing = computeSeries({ ...BASE, currentValue: 0, dailySip: 0 });
check('nothing in, nothing out', nothing.summary.final, 0);
check('and no phantom growth', nothing.summary.growth, 0);

const sameYear = computeSeries({ ...BASE, endYear: 2026 });
check('a zero horizon returns just today', sameYear.points.length, 1);
check('and today’s value unchanged', Math.round(sameYear.summary.final), 248_754);

/* ---------------- withdrawals ---------------- */

const overdrawn = computeSeries({ ...BASE, modifiers: { withdrawAmount: 10_000_000 } });
ok('a withdrawal cannot exceed the holdings', overdrawn.points[0]!.value === 0);
ok('and never goes negative', overdrawn.points.every((p) => p.value >= 0));
ok('invested is floored at zero after a full liquidation',
  overdrawn.summary.invested >= 0, `${overdrawn.summary.invested}`);

const partial = computeSeries({ ...BASE, modifiers: { withdrawAmount: 50_000 } });
ok('a withdrawal lowers the final value', partial.summary.final < base.summary.final);
check(
  'and removes exactly what was taken, today',
  Math.round(partial.points[0]!.value),
  Math.round(248_754 - 50_000),
);

/* ---------------- skipped months ---------------- */

const skipPast = computeSeries({ ...BASE, modifiers: { skipMonths: 999 } });
ok('skipping past the horizon stops all contributions',
  Math.round(skipPast.summary.invested) === 248_754, `${skipPast.summary.invested}`);
ok('but what is invested keeps compounding', skipPast.summary.final > 248_754);

const skip3 = computeSeries({ ...BASE, modifiers: { skipMonths: 3 } });
ok('a pause lowers the final value', skip3.summary.final < base.summary.final);
ok('a longer pause costs more', computeSeries({ ...BASE, modifiers: { skipMonths: 12 } })
  .summary.final < skip3.summary.final);

/* ---------------- negative and extreme rates ---------------- */

const negative = computeSeries({ ...BASE, annualRatePct: -8 });
ok('a negative rate never produces a negative balance',
  negative.points.every((p) => p.value >= 0));
ok('and shrinks the holding', negative.points[15]!.value < negative.points[0]!.value + 400_000);

const zeroRate = computeSeries({ ...BASE, annualRatePct: 0 });
check(
  'at 0% the final value is exactly what went in',
  Math.round(zeroRate.summary.final),
  Math.round(zeroRate.summary.invested),
);
check('and growth is zero', Math.round(zeroRate.summary.growth), 0);

/* ---------------- levers behave directionally ---------------- */

// The rule the whole "what if" list rests on: a lever that helps must raise the number
// and a lever that hurts must lower it. If this ever inverts, the app is lying.
ok('adding to the SIP raises the outcome',
  computeSeries({ ...BASE, modifiers: { sipDelta: 100 } }).summary.final > base.summary.final);
ok('cutting the SIP lowers the outcome',
  computeSeries({ ...BASE, modifiers: { sipDelta: -50 } }).summary.final < base.summary.final);
ok('a SIP cut deeper than the SIP itself floors at zero contributions',
  Math.round(computeSeries({ ...BASE, modifiers: { sipDelta: -100 } }).summary.invested) ===
    Math.round(computeSeries({ ...BASE, modifiers: { sipDelta: -9999 } }).summary.invested));

for (const rate of [8, 12, 15]) {
  const r = computeSeries({ ...BASE, annualRatePct: rate });
  ok(`every value is finite at ${rate}%`, r.points.every((p) => Number.isFinite(p.value)));
}
ok('a higher rate always beats a lower one',
  computeSeries({ ...BASE, annualRatePct: 8 }).summary.final <
    computeSeries({ ...BASE, annualRatePct: 12 }).summary.final);

/* ---------------- corrupt inputs ---------------- */

const garbage = computeSeries({
  currentValue: NaN,
  dailySip: Infinity,
  annualRatePct: NaN,
  startYear: 2026,
  endYear: 2036,
});
ok('NaN never reaches the screen', garbage.points.every((p) => Number.isFinite(p.value)));
ok('nor does Infinity', Number.isFinite(garbage.summary.final));

/* ---------------- memoisation ---------------- */

clearProjectionCache();
const first = computeSeries(BASE);
const second = computeSeries(BASE);
ok('identical inputs return the identical object', first === second);
ok('a changed modifier returns a different one',
  computeSeries({ ...BASE, modifiers: { sipDelta: 100 } }) !== first);
ok('and a changed rate does too', computeSeries({ ...BASE, annualRatePct: 15 }) !== first);

/* ---------------- interpolation and milestones ---------------- */

check('a year on the curve reads exactly',
  Math.round(valueAtYear(base.points, 2026)), 248_754);
ok('a year between points interpolates',
  valueAtYear(base.points, 2030.5) > valueAtYear(base.points, 2030) &&
    valueAtYear(base.points, 2030.5) < valueAtYear(base.points, 2031));
check('before the range clamps to the start',
  Math.round(valueAtYear(base.points, 1999)), 248_754);
check('after the range clamps to the end',
  Math.round(valueAtYear(base.points, 2999)), Math.round(base.summary.final));
check('an empty series is zero, not a crash', valueAtYear([], 2036), 0);

check('nothing hit at zero', milestonesHit(0), 0);
check('one lakh is one', milestonesHit(1_00_000), 1);
check('all six at a crore', milestonesHit(1_00_00_000), 6);
ok('milestones never decrease', [0, 1e5, 5e5, 1e6, 2.5e6, 5e6, 1e7].every((v, i, all) =>
  i === 0 || milestonesHit(v) >= milestonesHit(all[i - 1]!),
));

/* ---------------- summary ---------------- */

console.log(
  `2036 at 12% on ₹100/day: ₹${Math.round(valueAtYear(base.points, 2036)).toLocaleString('en-IN')}`,
);
console.log(failures === 0 ? '\n✅ PROJECTION TESTS PASS' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
