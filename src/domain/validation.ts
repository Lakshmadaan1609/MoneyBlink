/**
 * Input rules for sign-up.
 *
 * Pure functions, deliberately separate from the screens that use them, so every rule
 * is unit-testable and the same rule is enforced on the client *and* at the API
 * boundary. A screen validating one way while the endpoint validates another is how
 * inconsistent, unexplainable failures happen.
 */

/** Indian mobile numbers are ten digits, excluding the +91 country code. */
export const PHONE_LENGTH = 10;
export const OTP_LENGTH = 4;

/** The only OTP the mock backend accepts. */
export const MOCK_OTP = '1111';

export const MIN_AGE = 18;
export const MAX_AGE = 100;
export const MAX_NAME_LENGTH = 40;

export type ValidationResult = { valid: true } | { valid: false; reason: string };

const ok: ValidationResult = { valid: true };
const fail = (reason: string): ValidationResult => ({ valid: false, reason });

/** Strips everything that is not a digit — paste, autofill and IME input all vary. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Formats a partial number as "98765 43210" while typing.
 * Purely cosmetic; the raw digits are what is stored and validated.
 */
export function formatPhone(digits: string): string {
  const d = digitsOnly(digits).slice(0, PHONE_LENGTH);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

export function validatePhone(value: string): ValidationResult {
  const digits = digitsOnly(value);

  if (digits.length === 0) return fail('Enter your mobile number');
  if (digits.length < PHONE_LENGTH) return fail(`Enter all ${PHONE_LENGTH} digits`);
  if (digits.length > PHONE_LENGTH) return fail(`A mobile number is ${PHONE_LENGTH} digits`);

  // Indian mobile numbers begin 6–9. Catching this here gives a precise message
  // instead of a generic failure after the user waits for an OTP that never arrives.
  if (!/^[6-9]/.test(digits)) return fail('Indian mobile numbers start with 6, 7, 8 or 9');

  // A repeated digit is never a real number and is the most common junk input.
  if (/^(\d)\1{9}$/.test(digits)) return fail('That does not look like a real number');

  return ok;
}

export function validateOtp(value: string): ValidationResult {
  const digits = digitsOnly(value);
  if (digits.length === 0) return fail('Enter the code we sent you');
  if (digits.length < OTP_LENGTH) return fail(`Enter all ${OTP_LENGTH} digits`);
  if (digits !== MOCK_OTP) return fail('That code is not right');
  return ok;
}

export function validateName(value: string): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) return fail('Tell us your name');
  if (trimmed.length < 2) return fail('That name looks too short');
  if (trimmed.length > MAX_NAME_LENGTH) return fail(`Keep it under ${MAX_NAME_LENGTH} characters`);
  // Letters from any script, plus combining marks, spaces, hyphens and apostrophes.
  // \p{M} is essential, not decoration: Indic scripts build vowels from combining
  // marks, so "अंकिता" is letters *and* marks. Matching \p{L} alone would reject most
  // names written in Devanagari, Tamil or Bengali.
  if (!/^[\p{L}][\p{L}\p{M}\s'’.-]*$/u.test(trimmed)) return fail('Use letters only');
  return ok;
}

export function validateAge(value: string): ValidationResult {
  const digits = digitsOnly(value);
  if (digits.length === 0) return fail('Enter your age');

  const age = Number(digits);
  if (!Number.isFinite(age)) return fail('Enter a valid age');
  if (age < MIN_AGE) return fail(`You must be ${MIN_AGE} or older to invest`);
  if (age > MAX_AGE) return fail('Enter a valid age');
  return ok;
}

/** First name only — used for greetings, where a full legal name reads stiff. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
