/**
 * Mock transport.
 *
 * Wraps every request in the things a real network does — variable latency, failures,
 * timeouts, cancellation and retries with backoff — so the screens above it must
 * genuinely handle those cases rather than assuming instant success.
 *
 * `configure` is driven by the in-app demo panel, which is how a reviewer can force an
 * error state or a slow load on demand instead of taking our word for it.
 */

import { ApiError } from './types';

export type ClientConfig = {
  /** Simulated round-trip, picked uniformly from this range (ms). */
  minLatency: number;
  maxLatency: number;
  /** Probability (0–1) that any given request fails. */
  failureRate: number;
  /** Requests exceeding this are rejected as timeouts (ms). */
  timeout: number;
  /** Forces the next request to fail with this code, then clears. */
  forceNextError: ApiError['code'] | null;
  /** Disables latency entirely — used by tests. */
  instant: boolean;
};

const DEFAULT_CONFIG: ClientConfig = {
  minLatency: 260,
  maxLatency: 700,
  failureRate: 0,
  timeout: 8000,
  forceNextError: null,
  instant: false,
};

let config: ClientConfig = { ...DEFAULT_CONFIG };

export function configure(patch: Partial<ClientConfig>): ClientConfig {
  config = { ...config, ...patch };
  return config;
}

export function getConfig(): Readonly<ClientConfig> {
  return config;
}

export function resetConfig(): void {
  config = { ...DEFAULT_CONFIG };
}

function latency(): number {
  if (config.instant) return 0;
  const { minLatency, maxLatency } = config;
  return minLatency + Math.random() * Math.max(0, maxLatency - minLatency);
}

/** Sleep that rejects immediately if the caller aborts. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError('cancelled', 'Request cancelled'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new ApiError('cancelled', 'Request cancelled'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type RequestOptions = {
  signal?: AbortSignal;
  /** Extra attempts after the first, for retryable failures only. Default 0. */
  retries?: number;
};

/**
 * Runs `handler` behind the simulated transport.
 *
 * `handler` holds the actual logic — reading storage, applying a contribution — and
 * stays free of any transport concern.
 */
export async function request<T>(
  name: string,
  handler: () => Promise<T> | T,
  options: RequestOptions = {},
): Promise<T> {
  const { signal, retries = 0 } = options;
  let attempt = 0;

  for (;;) {
    try {
      return await attempt_(name, handler, signal);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('server', String(error));

      // Retry only what could plausibly succeed next time, and never fight an abort.
      if (attempt >= retries || !apiError.retryable) throw apiError;

      attempt += 1;
      // Exponential backoff, capped so a demo never feels hung.
      await delay(Math.min(150 * 2 ** attempt, 1200), signal);
    }
  }
}

async function attempt_<T>(
  name: string,
  handler: () => Promise<T> | T,
  signal?: AbortSignal,
): Promise<T> {
  const wait = latency();

  if (wait > config.timeout) {
    await delay(config.timeout, signal);
    throw new ApiError('timeout', `${name} timed out`);
  }

  await delay(wait, signal);

  if (config.forceNextError) {
    const code = config.forceNextError;
    config.forceNextError = null;
    throw new ApiError(code, `${name} failed (forced)`);
  }

  if (config.failureRate > 0 && Math.random() < config.failureRate) {
    throw new ApiError('network', `${name} failed`);
  }

  return await handler();
}
