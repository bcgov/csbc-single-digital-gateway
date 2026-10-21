import { multiChoiceOptions } from '../../renderers/ui/choice-options';
import type { CriterionField, FieldKind } from '../criteria';
import { DEFAULT_VARIANT, variantOf, type DocumentContent, type Uischema } from '../document-types';
import { findById, idOf } from '../element-ids';
import { formsOf } from '../funnel-model';
import { ancestorsOf, controlsIn, fieldOf } from '../upstream-fields';

const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Doc 256 rule 4: the fields a rule on `elementId` may test — every Control in a Form UPSTREAM of its Form in a Funnel
 * (earlier pages first), then the Controls BEFORE it in its own Form in document order, never the element itself or
 * anything inside it. A key is offered once (its first Control). The nearest source above the element is LAST. Read
 * from `variant` — the one being edited (doc 262 rule 14).
 */
export function ruleSources(
  content: DocumentContent,
  elementId: string,
  variant: string = DEFAULT_VARIANT,
): CriterionField[] {
  const root = variantOf(content, variant);
  const form = formOf(root, elementId);
  if (form === undefined) return [];
  const properties = isRecord(content.schema['properties']) ? content.schema['properties'] : {};
  const upstream =
    root['type'] === 'Funnel' ? ancestorsOf(root, idOf(form) ?? '') : new Set<string>();
  const controls = [
    ...formsOf(root)
      .filter((f) => upstream.has(idOf(f) ?? ''))
      .flatMap(controlsIn),
    ...controlsBefore(form, elementId),
  ];
  const fields = new Map<string, CriterionField>();
  for (const control of controls) {
    const key = PROPERTY_SCOPE.exec(String(control['scope']))?.[1];
    const property = key === undefined ? undefined : properties[key];
    if (key === undefined || fields.has(key) || !isRecord(property)) continue;
    const field = sourceField(key, property, control);
    if (field !== undefined) fields.set(key, field);
  }
  return [...fields.values()];
}

/** Field key → kind, for `compileRule`. */
export function kindsOf(fields: readonly CriterionField[]): Map<string, FieldKind> {
  return new Map(fields.map((field) => [field.key, field.kind]));
}

/** The Form holding `elementId`: the root Form, or the Funnel Form it is inside. */
function formOf(root: Uischema, elementId: string): Uischema | undefined {
  if (root['type'] === 'Form') return findById(root, elementId) === undefined ? undefined : root;
  return formsOf(root).find((form) => findById(form, elementId) !== undefined);
}

/** The Controls before `elementId` in `form`, depth first; the walk stops at the element, skipping its subtree. */
function controlsBefore(form: Uischema, elementId: string): Uischema[] {
  const found: Uischema[] = [];
  const walk = (node: Uischema): boolean => {
    const elements = node['elements'];
    if (!Array.isArray(elements)) return false;
    for (const child of elements) {
      if (!isRecord(child)) continue;
      if (idOf(child) === elementId) return true;
      if (child['type'] === 'Control') found.push(child);
      if (walk(child)) return true;
    }
    return false;
  };
  walk(form);
  return found;
}

/** A Control as a source: a multiple choice is `multi` (rules only), anything else as Funnel Conditions read it. */
function sourceField(
  key: string,
  property: Record<string, unknown>,
  control: Uischema,
): CriterionField | undefined {
  const options = multiChoiceOptions(property);
  if (options === undefined) return fieldOf(key, property, control);
  const title = property['title'];
  const label = typeof title === 'string' && title !== '' ? title : key;
  return {
    key,
    label,
    kind: 'multi',
    options: options.map((option) => ({ value: option.value, label: option.label })),
  };
}
