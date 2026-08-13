/**
 * Currency formatting that runs on the UI thread.
 *
 * A counter driven by `useAnimatedProps` formats inside a worklet, where a normal JS
 * function from `./format` cannot be called. Written without regex, which is not
 * available in the Reanimated runtime.
 *
 * `tests/domain.test.ts` asserts these agree with their JS twins in `./format`, because
 * two implementations of Indian digit grouping that disagree is a bug nobody notices
 * until a screenshot goes out.
 */

/** 1234567 → "12,34,567" */
export function groupIndianWorklet(value: number): string {
  'worklet';
  const negative = value < 0;
  const digits = String(Math.abs(Math.round(value)));

  let grouped = digits;
  if (digits.length > 3) {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    let pairs = '';
    while (rest.length > 2) {
      pairs = ',' + rest.slice(-2) + pairs;
      rest = rest.slice(0, -2);
    }
    grouped = rest + pairs + ',' + last3;
  }

  return (negative ? '-' : '') + grouped;
}

/** 5264180 → "₹52.6L". Keeps hero figures from wrapping on a 320pt screen. */
export function compactWorklet(value: number): string {
  'worklet';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e7) {
    const n = abs / 1e7;
    return sign + '₹' + (n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 1 : 2)) + ' Cr';
  }
  if (abs >= 1e5) {
    const n = abs / 1e5;
    return sign + '₹' + (n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 1 : 2)) + ' L';
  }
  return sign + '₹' + groupIndianWorklet(abs);
}

/** Full precision with the rupee sign: 5264180 → "₹52,64,180". */
export function rupeeWorklet(value: number): string {
  'worklet';
  return (value < 0 ? '-' : '') + '₹' + groupIndianWorklet(Math.abs(value));
}
