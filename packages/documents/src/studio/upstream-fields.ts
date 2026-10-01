import type { CriterionField, FieldKind, FieldOption } from './criteria';
import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { edgesOf, elementsOf, formsOf } from './funnel-model';

const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/**
 * The fields a Condition may test: every Control, at any depth, inside a Form UPSTREAM of `nodeId` (one that
 * reaches it along edges), typed from the schema property its scope names. The first Control naming a key wins;
 * Controls whose property is missing or of a type no clause can test are skipped.
 */
export function upstreamFields(
  schema: Record<string, unknown>,
  uischema: Uischema,
  nodeId: string,
): CriterionField[] {
  const ancestors = ancestorsOf(uischema, nodeId);
  const properties = isRecord(schema['properties']) ? schema['properties'] : {};
  const fields = new Map<string, CriterionField>();
  for (const form of formsOf(uischema)) {
    if (!ancestors.has(idOf(form) ?? '')) continue;
    for (const control of controlsIn(form)) {
      const key = PROPERTY_SCOPE.exec(String(control['scope']))?.[1];
      const property = key === undefined ? undefined : properties[key];
      if (key === undefined || fields.has(key) || !isRecord(property)) continue;
      const field = fieldOf(key, property, control);
      if (field !== undefined) fields.set(key, field);
    }
  }
  return [...fields.values()];
}

/** Every node that reaches `nodeId` along the variant's edges, not counting `nodeId` itself. */
function ancestorsOf(uischema: Uischema, nodeId: string): Set<string> {
  const edges = edgesOf(uischema);
  const seen = new Set<string>();
  const pending = [nodeId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const edge of edges) {
      if (edge.target !== current || seen.has(edge.source)) continue;
      seen.add(edge.source);
      pending.push(edge.source);
    }
  }
  seen.delete(nodeId);
  return seen;
}

function controlsIn(element: Uischema): Uischema[] {
  const found: Uischema[] = [];
  for (const child of elementsOf(element)) {
    if (!isRecord(child)) continue;
    if (child['type'] === 'Control') found.push(child);
    found.push(...controlsIn(child));
  }
  return found;
}

function fieldOf(
  key: string,
  property: Record<string, unknown>,
  control: Uischema,
): CriterionField | undefined {
  const label =
    typeof control['label'] === 'string'
      ? control['label']
      : typeof property['title'] === 'string'
        ? property['title']
        : key;
  const options = choicesOf(property);
  if (options !== undefined) return { key, label, kind: 'choice', options };
  const kind = KIND_BY_TYPE[String(property['type'])];
  return kind === undefined ? undefined : { key, label, kind };
}

const KIND_BY_TYPE: Record<string, FieldKind> = {
  string: 'text',
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
};

/** A property's choices: `oneOf` consts (titled) or an `enum`; `undefined` when it is not a choice. */
function choicesOf(property: Record<string, unknown>): FieldOption[] | undefined {
  const { oneOf, enum: values } = property;
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    const options = oneOf.flatMap((entry): FieldOption[] => {
      if (!isRecord(entry)) return [];
      const value = entry['const'];
      if (typeof value !== 'string' && typeof value !== 'number') return [];
      return [
        { value, label: typeof entry['title'] === 'string' ? entry['title'] : String(value) },
      ];
    });
    return options.length > 0 ? options : undefined;
  }
  if (Array.isArray(values) && values.length > 0) {
    return values
      .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
      .map((value) => ({ value, label: String(value) }));
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
