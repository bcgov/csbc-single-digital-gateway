type Uischema = Record<string, unknown>;

/** The parts of an Ajv error this reads (JSONForms' `core.errors`). */
export interface ValidationError {
  instancePath: string;
  keyword: string;
  params?: unknown;
}

/**
 * The data paths a tab's fields write (doc 272 rule 3), as JSON pointers: `#/properties/a` → `/a`, and a record item
 * field `#/properties/a/items/properties/b` → `/a` (its errors sit under the array, at any item).
 */
export function tabDataPaths(layout: Uischema): string[] {
  const own: string[] = [];
  const scope = layout['scope'];
  if (layout['type'] === 'Control' && typeof scope === 'string') {
    const match = /^#\/properties\/([^/]+)/.exec(scope);
    if (match !== null) own.push(`/${match[1]}`);
  }
  const elements = layout['elements'];
  const below = Array.isArray(elements)
    ? elements.flatMap((child: unknown) =>
        typeof child === 'object' && child !== null && !Array.isArray(child)
          ? tabDataPaths(child as Uischema)
          : [],
      )
    : [];
  return [...own, ...below];
}

/** Whether any error belongs to one of `paths` — under it, or a root `required` error naming it. */
export function hasErrorIn(errors: readonly ValidationError[], paths: readonly string[]): boolean {
  return errors.some((error) => {
    if (
      paths.some((path) => error.instancePath === path || error.instancePath.startsWith(`${path}/`))
    )
      return true;
    const missing = (error.params as { missingProperty?: unknown } | undefined)?.missingProperty;
    return (
      error.keyword === 'required' &&
      typeof missing === 'string' &&
      paths.includes(`${error.instancePath}/${missing}`)
    );
  });
}
