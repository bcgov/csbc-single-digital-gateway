/**
 * Doc 285 rule 1: whether a Control's label is hidden — `true` only for `options.hideLabel === true`, so any other value
 * shows it. Pure and React-free, so the inspector can read it; `control-label.tsx` draws what it decides.
 */
export function hideLabel(uischema: unknown): boolean {
  return recordOf(recordOf(uischema)?.['options'])?.['hideLabel'] === true;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
