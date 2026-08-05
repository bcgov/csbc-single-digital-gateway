/**
 * The form-builder's in-browser model and its (de)serialization to a JSONForms definition
 * (`{ schema, uischema }` as stored in `document_versions.schema`). The model — not the raw
 * schema/uischema — is the editor's source of truth; `parseModel`/`serializeModel` round-trip.
 */
import { ENUM_FIELD_TYPES, type FieldTypeId } from './field-types';

export { FIELD_TYPES } from './field-types';
export type { FieldTypeId, FieldTypeDef, FieldGroup } from './field-types';

export interface EnumOption {
  value: string;
  label: string;
}

export interface ControlNode {
  kind: 'control';
  key: string;
  fieldType: FieldTypeId;
  label: string;
  required: boolean;
  options: Record<string, unknown>;
  description?: string;
  enumOptions?: EnumOption[];
  /** Number field only (feature 155): integer vs decimal → `schema.type` `integer` | `number`. */
  numberType?: 'integer' | 'decimal';
  /**
   * Decimal number only (feature 155): max digits after the decimal point (default 2). Serialized as
   * `uischema.options.decimals`; enforced client-side (renderer) and server-side (submit). Explicit
   * `undefined` clears it (unbounded precision) — the inspector can reset it.
   */
  decimalPlaces?: number | undefined;
  /** Number/slider bound. Explicit `undefined` clears it (unbounded) — number field inspector. */
  min?: number | undefined;
  /** Number/slider bound. Explicit `undefined` clears it (unbounded) — number field inspector. */
  max?: number | undefined;
  step?: number;
  /** Address field only (feature 153): the author-set default country name, pre-filled for citizens. */
  defaultCountry?: string;
  /** Address field only: the author-set default state/province name. Cleared when the country changes. */
  defaultProvince?: string;
}

export type HeadingLevel = 2 | 3;
export type TextAlign = 'left' | 'center' | 'right';

/**
 * A display-only element (heading / paragraph / rich text). It renders presentational content and
 * collects NO data — it serializes to a `Label` uischema element with no `schema.properties` entry
 * (feature 81). `id` is a stable identity persisted through serialize↔parse so its dnd sortable id
 * stays stable across edits (controls rely on their schema `key` for the same purpose).
 */
export interface DisplayNode {
  kind: 'display';
  displayType: 'heading' | 'paragraph' | 'richtext';
  id: string;
  /** Heading / paragraph copy. Empty for richtext (content lives in `content`). */
  text: string;
  /** Heading only. */
  level?: HeadingLevel;
  /** Paragraph only. Absent = left (not serialized when left). */
  align?: TextAlign;
  /** Richtext only: the Lexical editor state (JSON), or null when empty. */
  content?: unknown;
}

export interface ContainerNode {
  kind: 'container';
  layout: 'group' | 'horizontal';
  label?: string;
  children: (ControlNode | DisplayNode)[];
}

export type FieldNode = ControlNode | ContainerNode | DisplayNode;

export interface FormModel {
  title: string;
  description: string;
  fields: FieldNode[];
}

export interface FormDefinition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

// (De)serialization lives in model-codec.ts to keep this file under the size gate.
export { parseModel, serializeModel } from './model-codec';

// ── Key helpers ───────────────────────────────────────────────────────────────────────────────

/** Slugify a label into a JSON-Schema-safe property key (`^[a-zA-Z_][a-zA-Z0-9_]*$`). */
export function fieldKeyFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (slug === '') {
    return 'field';
  }
  return /^[a-z_]/.test(slug) ? slug : `field_${slug}`;
}

/** Return `base` if free, else append the lowest numeric suffix that avoids `existing`. */
export function uniqueKey(base: string, existing: string[]): string {
  const taken = new Set(existing);
  if (!taken.has(base)) {
    return base;
  }
  let n = 2;
  while (taken.has(`${base}_${n}`)) {
    n += 1;
  }
  return `${base}_${n}`;
}

// ── Field factory ───────────────────────────────────────────────────────────────────────────────

type DisplayFieldTypeId = 'heading' | 'paragraph' | 'richtextdisplay';
type ControlFieldTypeId = Exclude<FieldTypeId, 'group' | 'horizontal' | DisplayFieldTypeId>;

/** Generate a stable, unique id for a display node (persisted in the uischema for dnd identity). */
function newDisplayId(): string {
  return globalThis.crypto.randomUUID();
}

/** A fresh display node for a Display-group palette type, with content defaults that round-trip. */
function createDisplayField(fieldType: DisplayFieldTypeId): DisplayNode {
  const id = newDisplayId();
  if (fieldType === 'heading') {
    return { kind: 'display', displayType: 'heading', id, text: 'Heading', level: 2 };
  }
  if (fieldType === 'paragraph') {
    return { kind: 'display', displayType: 'paragraph', id, text: 'Paragraph text' };
  }
  return { kind: 'display', displayType: 'richtext', id, text: '', content: null };
}

/** A fresh node for a palette field type, with sensible defaults that round-trip. */
export function createField(fieldType: ControlFieldTypeId): ControlNode;
export function createField(fieldType: DisplayFieldTypeId): DisplayNode;
export function createField(fieldType: 'group' | 'horizontal'): ContainerNode;
export function createField(fieldType: FieldTypeId): FieldNode;
export function createField(fieldType: FieldTypeId): FieldNode {
  if (fieldType === 'group' || fieldType === 'horizontal') {
    return { kind: 'container', layout: fieldType, children: [] };
  }
  if (fieldType === 'heading' || fieldType === 'paragraph' || fieldType === 'richtextdisplay') {
    return createDisplayField(fieldType);
  }
  const node: ControlNode = {
    kind: 'control',
    key: '',
    fieldType,
    label: '',
    required: false,
    options: {},
  };
  if (ENUM_FIELD_TYPES.has(fieldType)) {
    node.enumOptions = [
      { value: 'option_1', label: fieldType === 'oneof' ? 'Option 1' : 'option_1' },
    ];
  }
  if (fieldType === 'number') {
    // Default: decimal, floored at 0, 2 decimal places (feature 155). Author can switch type, clear
    // Min, or change the decimal-places limit in the inspector.
    node.numberType = 'decimal';
    node.min = 0;
    node.decimalPlaces = 2;
  }
  if (fieldType === 'slider') {
    node.min = 0;
    node.max = 100;
    node.step = 1;
  }
  if (fieldType === 'address') {
    // BC-Gov default: a new address field pre-fills Canada / British Columbia (authors can change or
    // clear it in the inspector). Names must match the geo dataset (feature 153).
    node.defaultCountry = 'Canada';
    node.defaultProvince = 'British Columbia';
  }
  return node;
}

// ── Tree navigation + drag/drop moves ───────────────────────────────────────────────────────────

export type Path = number[];

/** Where a dragged/added node lands: `container` = a top-level container index, or null for root. */
export interface DropTarget {
  container: number | null;
  index: number;
}

/** The node at `path` ([i] = top-level, [i,j] = child j of container i), or null. */
export function getNodeAt(model: FormModel, path: Path | null): FieldNode | null {
  if (path === null || path.length === 0) {
    return null;
  }
  const top = model.fields[path[0] as number];
  if (top === undefined) {
    return null;
  }
  if (path.length === 1) {
    return top;
  }
  return top.kind === 'container' ? (top.children[path[1] as number] ?? null) : null;
}

const clamp = (i: number, max: number): number => Math.max(0, Math.min(i, max));

/** Shallow-clone the field list, cloning each container's `children` array so splices are local. */
function cloneFields(fields: FieldNode[]): FieldNode[] {
  return fields.map((f) => (f.kind === 'container' ? { ...f, children: [...f.children] } : f));
}

/** Insert a node at a drop target. Containers can only land at root (no nesting). */
export function insertField(model: FormModel, node: FieldNode, target: DropTarget): FormModel {
  const fields = cloneFields(model.fields);
  const container = node.kind === 'container' ? null : target.container;
  if (container === null) {
    fields.splice(clamp(target.index, fields.length), 0, node);
  } else {
    const host = fields[container];
    if (host !== undefined && host.kind === 'container' && node.kind !== 'container') {
      host.children.splice(clamp(target.index, host.children.length), 0, node);
    } else {
      fields.splice(clamp(target.index, fields.length), 0, node);
    }
  }
  return { ...model, fields };
}

/** Remove the node at `from` and re-insert it at `target`, fixing indices for the removal. */
export function moveField(model: FormModel, from: Path, target: DropTarget): FormModel {
  const node = getNodeAt(model, from);
  if (node === null) {
    return model;
  }
  const fields = cloneFields(model.fields);

  // Remove the source node from its current list.
  if (from.length === 1) {
    fields.splice(from[0] as number, 1);
  } else {
    const host = fields[from[0] as number];
    if (host !== undefined && host.kind === 'container') {
      host.children.splice(from[1] as number, 1);
    }
  }

  // Containers never nest → force a root landing.
  let container = node.kind === 'container' ? null : target.container;
  // A removed root item before the target container shifts that container's index down by one.
  if (container !== null && from.length === 1 && (from[0] as number) < container) {
    container -= 1;
  }
  // Removing earlier in the SAME list shifts the insert index down by one.
  let index = target.index;
  const sameRoot = container === null && from.length === 1;
  const sameContainer = container !== null && from.length === 2 && from[0] === target.container;
  if ((sameRoot && (from[0] as number) < index) || (sameContainer && (from[1] as number) < index)) {
    index -= 1;
  }

  if (container === null) {
    fields.splice(clamp(index, fields.length), 0, node);
  } else {
    const host = fields[container];
    if (host !== undefined && host.kind === 'container' && node.kind !== 'container') {
      host.children.splice(clamp(index, host.children.length), 0, node);
    } else {
      fields.splice(clamp(index, fields.length), 0, node);
    }
  }
  return { ...model, fields };
}

/** All control keys currently in the model (top-level + nested), for uniqueness checks. */
export function allKeys(model: FormModel): string[] {
  const keys: string[] = [];
  for (const field of model.fields) {
    if (field.kind === 'control') {
      keys.push(field.key);
    } else if (field.kind === 'container') {
      for (const child of field.children) {
        if (child.kind === 'control') {
          keys.push(child.key);
        }
      }
    }
    // Display nodes have no key — skipped.
  }
  return keys;
}
