import { formsOf, isRecord, nodeIdOf, type FunnelElement } from './funnel-graph';

// Which Forms own which Ajv errors, and what Next, the rail and Submit do about them (doc 274 rules 19-22) — the
// documents restatement of `@repo/forms`' `runner/form-errors.ts` + `path-errors.ts`. PURE.

/** The shape of one Ajv error this module reads — structural, every field normalised. */
export interface FunnelError {
  instancePath?: unknown;
  keyword?: unknown;
  params?: unknown;
}

const TOP_LEVEL_SCOPE = /^#\/properties\/([^/]+)/;

/** Rule 19: the top-level keys the Controls anywhere below `element` bind (a record's item fields: the array's key). */
export function propertyKeysOf(element: FunnelElement, keys = new Set<string>()): Set<string> {
  const elements = element['elements'];
  if (!Array.isArray(elements)) return keys;
  for (const child of elements) {
    if (!isRecord(child)) continue;
    const key =
      child['type'] === 'Control' ? TOP_LEVEL_SCOPE.exec(String(child['scope']))?.[1] : undefined;
    if (key !== undefined) keys.add(key);
    propertyKeysOf(child, keys);
  }
  return keys;
}

/** Rule 19: the key an error belongs to — `instancePath`'s first segment, or a root `required`'s missing property. */
export function errorKey(error: FunnelError): string | undefined {
  const path = typeof error.instancePath === 'string' ? error.instancePath : '';
  if (path !== '') return path.split('/').find((segment) => segment !== '') || undefined;
  if (error.keyword !== 'required' || !isRecord(error.params)) return undefined;
  const missing = error.params['missingProperty'];
  return typeof missing === 'string' && missing !== '' ? missing : undefined;
}

/** Rule 20: whether a Form owns at least one of `errors`. */
export function formHasError(form: FunnelElement, errors: readonly FunnelError[]): boolean {
  if (errors.length === 0) return false;
  const keys = propertyKeysOf(form);
  return errors.some((error) => keys.has(errorKey(error) ?? ''));
}

export interface PathErrors {
  /** The path's Form ids, in order. */
  readonly formIds: readonly string[];
  /** Path Forms owning at least one error. */
  readonly erroredForms: ReadonlySet<string>;
  /** The first such Form — where Submit sends the citizen (rule 18). */
  readonly firstError: string | undefined;
  /** Submit is refused: a path Form has an error, or an error no Form owns. */
  readonly submitBlocked: boolean;
}

/** Rules 18, 21: errors attributed to the Forms on the path; an off-path Form's errors block nothing. */
export function pathErrors(
  funnel: FunnelElement,
  formIds: readonly string[],
  errors: readonly FunnelError[],
): PathErrors {
  const forms = new Map(formsOf(funnel).map((form) => [nodeIdOf(form) ?? '', form] as const));
  const errored = formIds.filter((id) => {
    const form = forms.get(id);
    return form !== undefined && formHasError(form, errors);
  });
  const owned = new Set<string>();
  for (const form of forms.values()) for (const key of propertyKeysOf(form)) owned.add(key);
  const unowned = errors.some((error) => !owned.has(errorKey(error) ?? ''));
  return {
    formIds,
    erroredForms: new Set(errored),
    firstError: errored[0],
    submitBlocked: errored.length > 0 || unowned,
  };
}

/** Rule 22: back (or staying) always opens; forward only when no Form from `from` up to `to` owns an error. */
export function mayOpen(
  errors: Pick<PathErrors, 'formIds' | 'erroredForms'>,
  from: string | null,
  to: string,
): boolean {
  const target = errors.formIds.indexOf(to);
  const start = from === null ? 0 : errors.formIds.indexOf(from);
  if (target === -1 || start === -1 || target <= start) return true;
  return !errors.formIds.slice(start, target).some((id) => errors.erroredForms.has(id));
}
