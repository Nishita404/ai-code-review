import { ApiError } from "@google/genai";

const RETRYABLE_STATUSES = new Set([429, 503]);
const BACKOFF_MS = [1_000, 2_000, 4_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1; // 4 total: 1 initial + 3 retries

function isRetryable(error: unknown): error is ApiError {
  return error instanceof ApiError && RETRYABLE_STATUSES.has(error.status ?? -1);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn` and automatically retries up to 3 times on 429 / 503 ApiErrors,
 * waiting 1 s → 2 s → 4 s between attempts.
 *
 * Any other error is re-thrown immediately without retrying.
 */
export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;

      lastError = error;

      const delay = BACKOFF_MS[attempt];
      if (delay === undefined) break; // exhausted retries

      await sleep(delay);
    }
  }

  throw lastError;
}
