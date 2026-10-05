import { isPlainNumber } from '../../renderers/ui/number-options';
import { isMultiChoice, isSingleChoice } from '../../renderers/ui/choice-options';
import { isObjectArray } from '../../renderers/ui/object-array';
import { isRichTextProperty } from '../../renderers/ui/rich-text-value';
import { isPlainString } from '../../renderers/ui/string-options';
import { DEFAULT_VARIANT, variantOf, type DocumentContent, type Uischema } from '../document-types';
import { findById, idOf } from '../element-ids';

/** What an inspected element is (doc 249 rule 4). */
export type TargetKind =
  | 'funnel'
  | 'form'
  | 'heading'
  | 'vertical-layout'
  | 'grid'
  | 'horizontal-layout'
  | 'separator'
  | 'checkbox'
  | 'switch'
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio-group'
  | 'multi-select'
  | 'checkbox-group'
  | 'rich-text'
  | 'data-table'
  | 'rich-content'
  | 'unknown';

/** Each kind as the target line names it (rule 5). */
export const KIND_NAMES: Readonly<Record<TargetKind, string>> = Object.freeze({
  funnel: 'Funnel',
  form: 'Form',
  heading: 'Heading',
  'vertical-layout': 'Vertical layout',
  grid: 'Grid',
  'horizontal-layout': 'Horizontal layout',
  separator: 'Separator',
  checkbox: 'Checkbox',
  switch: 'Switch',
  text: 'Text',
  textarea: 'Text area',
  number: 'Number',
  select: 'Select',
  'radio-group': 'Radio group',
  'multi-select': 'Multi-select',
  'checkbox-group': 'Checkbox group',
  'rich-text': 'Rich text',
  'data-table': 'Data table',
  'rich-content': 'Rich content',
  unknown: 'Element',
});

/** The schema property a Control binds (`#/properties/<key>`). */
export interface BoundProperty {
  key: string;
  schema: Record<string, unknown>;
  required: boolean;
  /** How many Controls in the variant bind this property (rule 10). */
  shared: number;
}

export interface InspectorTarget {
  /** The element's id — the inspector form is keyed by it (rule 16). */
  id: string;
  /** The variant it is in (doc 262): where its writes go, and whether schema settings are editable. */
  variant: string;
  element: Uischema;
  kind: TargetKind;
  /** The element as the author knows it (rule 5); `undefined` for a Separator or an unknown element. */
  name: string | undefined;
  /** Whether it is the variant's root, which can never be deleted or moved (doc 258 rule 3). */
  root: boolean;
  /** Whether it sits DIRECTLY in a Grid, so it has a placement to align (doc 260 rule 33). */
  inGrid: boolean;
  /** Whether it sits DIRECTLY in a HorizontalLayout (doc 261 rule 20). */
  inRow: boolean;
  /** The layout it sits directly in; `undefined` for the root. */
  parent?: Uischema;
  property?: BoundProperty;
}

/** What the studio knows about the selection (rule 1). */
export interface TargetInputs {
  /** The focused page's element selection; may be stale. */
  pageSelectedId: string | null;
  /** The focused Form, or `null`. */
  focusedId: string | null;
  /** The Form the footer path ends at: selected, else focused. */
  formId: string | null;
}

/**
 * The inspected element (rules 1-3): a page element inside the focused Form › the selected/focused Form › the root.
 * `null` for an empty root.
 */
export function inspectorTarget(
  content: DocumentContent,
  inputs: TargetInputs,
  variant: string = DEFAULT_VARIANT,
): InspectorTarget | null {
  const root = variantOf(content, variant);
  if (typeof root['type'] !== 'string') return null;
  const element = pickElement(root, inputs) ?? root;
  const id = idOf(element);
  const parent = id === undefined ? undefined : parentOf(root, id);
  return targetOf(content, variant, element, element === root, parent);
}

function pickElement(root: Uischema, { pageSelectedId, focusedId, formId }: TargetInputs) {
  const focused = focusedId === null ? undefined : findById(root, focusedId);
  if (focused !== undefined && pageSelectedId !== null && pageSelectedId !== focusedId) {
    const element = findById(focused, pageSelectedId);
    if (element !== undefined) return element;
  }
  return formId === null ? undefined : findById(root, formId);
}

function targetOf(
  content: DocumentContent,
  variant: string,
  element: Uischema,
  root: boolean,
  parent: Uischema | undefined,
): InspectorTarget {
  const id = idOf(element) ?? '';
  const property =
    element['type'] === 'Control' ? boundProperty(content, variant, element) : undefined;
  const kind = kindOf(element, property);
  return {
    id,
    variant,
    element,
    kind,
    name: nameOf(element, kind, property),
    root,
    inGrid: parent?.['type'] === 'Grid',
    inRow: parent?.['type'] === 'HorizontalLayout',
    ...(parent !== undefined && { parent }),
    ...(property !== undefined && { property }),
  };
}

/** The element whose `elements` directly hold the element with id `id`. */
export function parentOf(node: Uischema, id: string): Uischema | undefined {
  const elements = node['elements'];
  if (!Array.isArray(elements)) return undefined;
  for (const child of elements) {
    const record = recordOf(child);
    if (record === undefined) continue;
    if (idOf(record) === id) return node;
    const found = parentOf(record, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/** The property a Control's scope names, when the schema has it. */
function boundProperty(
  content: DocumentContent,
  variant: string,
  control: Uischema,
): BoundProperty | undefined {
  const scope = control['scope'];
  const key = typeof scope === 'string' ? PROPERTY_SCOPE.exec(scope)?.[1] : undefined;
  const properties = recordOf(content.schema['properties']);
  const schema = key === undefined ? undefined : recordOf(properties?.[key]);
  if (key === undefined || schema === undefined) return undefined;
  const required = content.schema['required'];
  return {
    key,
    schema,
    required: Array.isArray(required) && required.includes(key),
    shared: countBinding(variantOf(content, variant), scope as string),
  };
}

function countBinding(node: Uischema, scope: string): number {
  const self = node['type'] === 'Control' && node['scope'] === scope ? 1 : 0;
  const elements = node['elements'];
  if (!Array.isArray(elements)) return self;
  return elements.reduce<number>(
    (sum, child) => sum + (recordOf(child) === undefined ? 0 : countBinding(child, scope)),
    self,
  );
}

const LAYOUT_KINDS: Readonly<Record<string, TargetKind>> = Object.freeze({
  Funnel: 'funnel',
  Form: 'form',
  Heading: 'heading',
  VerticalLayout: 'vertical-layout',
  Grid: 'grid',
  HorizontalLayout: 'horizontal-layout',
  Separator: 'separator',
  RichContent: 'rich-content',
});

/** Rule 4: element types by name; Controls through the renderers' own predicates, then `options.component`. */
function kindOf(element: Uischema, property: BoundProperty | undefined): TargetKind {
  const type = element['type'];
  if (type !== 'Control') return (typeof type === 'string' && LAYOUT_KINDS[type]) || 'unknown';
  if (property === undefined) return 'unknown';
  const component = recordOf(element['options'])?.['component'];
  const { schema } = property;
  if (isRichTextProperty(schema)) return 'rich-text';
  if (isObjectArray(schema)) return 'data-table';
  if (schema['type'] === 'boolean') return component === 'switch' ? 'switch' : 'checkbox';
  if (isPlainString(schema)) return component === 'textarea' ? 'textarea' : 'text';
  if (isPlainNumber(schema)) return 'number';
  if (isSingleChoice(schema)) return component === 'radio-group' ? 'radio-group' : 'select';
  if (isMultiChoice(schema))
    return component === 'checkbox-group' ? 'checkbox-group' : 'multi-select';
  return 'unknown';
}

const FALLBACK_NAMES: Partial<Record<TargetKind, string>> = {
  funnel: 'Funnel',
  form: 'Untitled form',
  heading: 'Untitled heading',
};

/** Rule 5: a Funnel/Form's label, a Heading's text, a Control's title else its key. */
function nameOf(
  element: Uischema,
  kind: TargetKind,
  property: BoundProperty | undefined,
): string | undefined {
  if (property !== undefined) return nonBlank(property.schema['title']) ?? property.key;
  if (kind === 'funnel' || kind === 'form')
    return nonBlank(element['label']) ?? FALLBACK_NAMES[kind];
  if (kind === 'heading')
    return nonBlank(recordOf(element['options'])?.['text']) ?? FALLBACK_NAMES[kind];
  return undefined;
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
