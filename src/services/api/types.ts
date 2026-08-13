/**
 * API contract.
 *
 * There is no server behind FutureOS, but every read and write still goes through a
 * typed request/response layer with latency, cancellation and a real error taxonomy.
 * That is deliberate: loading, empty, error and success states are only honest if the
 * code paths that produce them actually exist. Swapping the mock transport for HTTP
 * later would touch `client.ts` and nothing else.
 */

export type ApiErrorCode =
  /** Transport failed — no response at all. */
  | 'network'
  /** Response did not arrive within the deadline. */
  | 'timeout'
  /** Backend blew up. */
  | 'server'
  /** Caller sent something invalid — a negative amount, an unknown goal. */
  | 'validation'
  /** Request was legal but breaches a product rule, e.g. the 50% LTV cap. */
  | 'limit_exceeded'
  /** Nothing to return — used to distinguish "empty" from "broken". */
  | 'not_found'
  /** Local persistence failed: quota, corruption, unavailable. */
  | 'storage'
  /** Caller aborted deliberately. */
  | 'cancelled';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** Whether a retry could plausibly succeed — drives whether the UI offers one. */
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = code === 'network' || code === 'timeout' || code === 'server';
    this.details = details;
  }
}

/** Human-facing copy per failure. Kept beside the taxonomy so no case goes unhandled. */
export const API_ERROR_COPY: Record<ApiErrorCode, { title: string; message: string }> = {
  network: {
    title: 'No connection',
    message: "We couldn't reach BlinkMoney. Check your connection and try again.",
  },
  timeout: {
    title: 'Taking too long',
    message: 'That request timed out. Your money is safe — please try again.',
  },
  server: {
    title: 'Something broke',
    message: 'This one is on us. Try again in a moment.',
  },
  validation: {
    title: "That won't work",
    message: 'Please check the amount and try again.',
  },
  limit_exceeded: {
    title: 'Over your limit',
    message: 'You can borrow up to 50% of your portfolio value.',
  },
  not_found: {
    title: 'Nothing here yet',
    message: 'Start your journey to see this come alive.',
  },
  storage: {
    title: "Couldn't save",
    message: "We couldn't write to this device's storage.",
  },
  cancelled: {
    title: 'Cancelled',
    message: 'That request was cancelled.',
  },
};

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Normalises anything thrown into an ApiError so UI never sees a raw exception. */
export function toApiError(value: unknown): ApiError {
  if (isApiError(value)) return value;
  if (value instanceof Error) return new ApiError('server', value.message, value);
  return new ApiError('server', 'Unexpected error', value);
}
