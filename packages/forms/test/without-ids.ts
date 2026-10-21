/**
 * Doc 219: every element carries a stamped authored `id`, and a freshly inserted one is random per run —
 * so a test comparing an element by deep equality has to drop it first.
 *
 * NAMED `withoutAuthoredIds`, not `stripIds`: doc 200 rule 1 records that a shared test helper taking a
 * name files already use locally is silently shadowed — or silently shadows — and turns into the wrong
 * function. This name appears nowhere else in the suite.
 */
export function withoutAuthoredIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutAuthoredIds) as unknown as T;
  if (typeof value !== 'object' || value === null) return value;
  const { id: _id, ...rest } = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(rest).map(([key, entry]) => [key, withoutAuthoredIds(entry)]),
  ) as T;
}
