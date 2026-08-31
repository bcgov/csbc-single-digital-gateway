import type { EditOption, EditableSection, UiElement } from './types';

/**
 * Lowercase, collapse every run of non-alphanumerics to a single dash, trim dashes off both ends.
 * `'Data & privacy'` → `'data-privacy'`. Shared with the service-details section anchors so a
 * section's edit id and its `#hash` anchor agree.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const childrenOf = (element: unknown): UiElement[] => {
  const elements = asRecord(element).elements;
  return Array.isArray(elements) ? (elements as UiElement[]) : [];
};

/**
 * Normalize an element's `options` into an {@link EditOption}, or `null` when it isn't editable.
 *
 * Tolerant by design (the CLAUDE.md "normalize a JSONB blob before use" rule): the uischema is
 * author-written JSON, so a malformed `edit` value must degrade to "not editable" rather than throw
 * on the render path.
 */
export function readEditOption(options: unknown): EditOption | null {
  const edit = asRecord(options).edit;
  if (edit === true) {
    return { editor: null, id: null, actionLabel: null };
  }
  if (edit === null || typeof edit !== 'object' || Array.isArray(edit)) {
    return null;
  }
  const bag = edit as Record<string, unknown>;
  const editor = asText(bag.editor);
  const id = asText(bag.id);
  const actionLabel = asText(bag.actionLabel);
  return {
    editor: editor === '' ? null : editor,
    id: id === '' ? null : id,
    actionLabel: actionLabel === '' ? null : actionLabel,
  };
}

/**
 * Every editable element in the tree, in pre-order document order, with a unique id.
 *
 * Id resolution mirrors the anchor rule already proven in the service-details sections: an authored
 * `options.edit.id` wins, else the slugified label, else `edit-<n>`; a repeat takes a `-2`, `-3` …
 * suffix. It is a pure function of the tree, so `stampEditIds` and `findEditableSection` always
 * agree on an id without sharing any state.
 */
export function collectEditableSections(uischema: unknown): EditableSection[] {
  const sections: EditableSection[] = [];
  const used = new Map<string, number>();

  const visit = (element: UiElement): void => {
    const edit = readEditOption(element.options);
    if (edit !== null) {
      const label = asText(element.label);
      const base =
        edit.id ?? (slugify(label) === '' ? `edit-${sections.length + 1}` : slugify(label));
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      sections.push({
        id: seen === 0 ? base : `${base}-${seen + 1}`,
        label,
        editor: edit.editor,
        actionLabel: edit.actionLabel,
        element,
      });
    }
    childrenOf(element).forEach(visit);
  };

  childrenOf(uischema).forEach(visit);
  return sections;
}

/** The editable section with the given resolved id, or `undefined`. */
export function findEditableSection(uischema: unknown, id: string): EditableSection | undefined {
  return collectEditableSections(uischema).find((section) => section.id === id);
}

/**
 * A deep copy of `uischema` in which every editable element's `options.edit` is normalized to
 * `{ editor, id }` with the id RESOLVED. Renderers see only their own element, so stamping is what
 * lets a layout renderer know which section it is without walking the tree itself.
 */
export function stampEditIds<T>(uischema: T): T {
  const ids = new Map<UiElement, string>();
  for (const section of collectEditableSections(uischema)) {
    ids.set(section.element, section.id);
  }

  const clone = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(clone);
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    const element = value as UiElement;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(element)) {
      next[key] = key === 'options' ? { ...asRecord(entry) } : clone(entry);
    }
    const id = ids.get(element);
    if (id !== undefined) {
      const edit = readEditOption(element.options);
      next.options = {
        ...asRecord(element.options),
        edit: { editor: edit?.editor ?? null, id, actionLabel: edit?.actionLabel ?? null },
      };
    }
    return next;
  };

  return clone(uischema) as T;
}
