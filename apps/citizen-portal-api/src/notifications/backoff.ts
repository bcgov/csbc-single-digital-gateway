/**
 * Exponential retry backoff for email deliveries: `base × 5^(attempts - 1)` where `attempts`
 * is the failure count AFTER incrementing (1st failure → base, 2nd → 5×base, 3rd → 25×base,
 * 4th → 125×base). Pure — the worker adds the result to now() for `next_attempt_at`.
 */
export function backoffMs(attempts: number, baseMs: number): number {
  const failures = Math.max(1, attempts);
  return baseMs * 5 ** (failures - 1);
}

/** Default backoff base: 1 minute (→ 1m, 5m, 25m, ~2h between retries). */
export const DEFAULT_BACKOFF_BASE_MS = 60_000;
