// Resetting progress when an answer changes the path (doc 202 rule 10g). PURE — no React.

/**
 * The visited set after the listed path changed from `previous` to `next`, or `visited` itself (same identity) when
 * nothing needs to go.
 *
 * Everything from the FIRST position where the two lists differ is reset to upcoming, in both lists: a stage the
 * answers just inserted (ticking "needs an inspection" puts Inspection before Review) means whatever the citizen
 * reached after it was reached down a different path, so it is no longer progress. A branch swapped out (Business for
 * Individual) resets the same way. Stages before the change keep their progress. The stage on screen is never reset
 * (`currentStageId`): the rail must not show the page you are looking at as unreached.
 */
export function visitedAfterPathChange(
  previous: readonly string[],
  next: readonly string[],
  visited: ReadonlySet<string>,
  currentStageId: string | undefined,
): ReadonlySet<string> {
  let first = 0;
  while (first < previous.length && first < next.length && previous[first] === next[first])
    first += 1;
  const reset = new Set([...previous.slice(first), ...next.slice(first)]);
  reset.delete(currentStageId ?? '');
  if (![...reset].some((id) => visited.has(id))) return visited;
  return new Set([...visited].filter((id) => !reset.has(id)));
}
