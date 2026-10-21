/**
 * Doc 292 rule 4: the answers a draft keeps when it moves to a newer version of its method — only the top-level keys
 * the new version's schema declares. Values are carried as they are; the new version validates them at submit.
 */
export function carryAnswers(
  data: Record<string, unknown>,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const properties = schema['properties'];
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) return {};
  const declared = new Set(Object.keys(properties));
  return Object.fromEntries(Object.entries(data).filter(([key]) => declared.has(key)));
}
