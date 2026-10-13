import { boundKeys, documentContentOf } from '@repo/documents/content';

/**
 * Doc 291 rule 13: `content` plus every variant `templateVariants` has under a name the content lacks (case-insensitive)
 * — how a service gains a variant its template added after the service was created (the Citizen view). Only a variant
 * whose bound properties all exist in the content's schema is adopted, so a template that has also grown new fields
 * can never hand a service a variant it cannot render; the content's own variants are never replaced.
 */
export function adoptVariants(
  content: Record<string, unknown>,
  templateVariants: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const document = documentContentOf(content);
  if (document === null) return content;
  const have = new Set(Object.keys(document.variants).map((name) => name.toLowerCase()));
  const properties = document.schema['properties'];
  const declared = new Set(
    typeof properties === 'object' && properties !== null ? Object.keys(properties) : [],
  );
  const adopted = Object.entries(templateVariants).filter(
    ([name, uischema]) =>
      !have.has(name.toLowerCase()) && boundKeys(uischema).every((key) => declared.has(key)),
  );
  if (adopted.length === 0) return content;
  const variants = content['variants'] as Record<string, unknown>;
  return { ...content, variants: { ...variants, ...Object.fromEntries(adopted) } };
}
