import { nanoid } from 'nanoid';

/**
 * Shared model for the "accordion group" field (feature 171). One source of truth for the item
 * shape, the coercion every render path runs, and the label/open-state derivations used by BOTH the
 * editable control (`accordion-group-control.tsx` + `accordion-item-row.tsx`) and the read-only view
 * (`../../../jsonforms-renderers-display/controls/accordion-group-view.tsx`).
 *
 * The value is a plain array of items, each a title plus a rich-text (Lexical) description. Order is
 * user-controlled.
 *
 * **This file must never import `@dnd-kit`.** It is the only module the display renderer pulls from
 * the form side, so an import here would drag the drag-and-drop library into every read-only surface
 * (citizen service pages, staff review, application status). See MDD doc 171.
 */

/** One accordion section: a plain-text title and a rich-text body. */
export interface AccordionItem {
  /**
   * Stable identity for dnd sortable ids and React keys. An item has no schema `key` to anchor
   * itself to, so the id is **persisted in the data** — the same reasoning that gave the form
   * builder's `DisplayNode` its `id` (feature 81). Index-based identity is not an option: it loses
   * input focus on every reorder.
   */
  id: string;
  title: string;
  /** A Lexical `SerializedEditorState`, or null when empty. */
  description: unknown;
}

/** Which sections the read-only view opens on first render. Authored per field in the builder. */
export type AccordionDefaultOpen = 'none' | 'first' | 'all';

export const ACCORDION_DEFAULT_OPEN_VALUES: readonly AccordionDefaultOpen[] = [
  'none',
  'first',
  'all',
];

export function isAccordionDefaultOpen(value: unknown): value is AccordionDefaultOpen {
  return (
    typeof value === 'string' &&
    ACCORDION_DEFAULT_OPEN_VALUES.includes(value as AccordionDefaultOpen)
  );
}

/** Feature 159's convention: an 8-char nanoid — collisions within one field's array are negligible. */
export function newAccordionItemId(): string {
  return nanoid(8);
}

/** A fresh, empty item for the add-row flow. */
export function emptyAccordionItem(): AccordionItem {
  return { id: newAccordionItemId(), title: '', description: null };
}

/**
 * A Lexical `SerializedEditorState` is an object with a `root` node. Anything else (a string, a
 * number, an array, `{}`) is not renderable by `RichTextView` and normalizes to null so a
 * hand-edited or corrupt blob renders empty instead of throwing inside the view.
 */
function isEditorState(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'root' in value;
}

/**
 * Coerce an unknown JSONB blob into well-formed items — called by every RENDER path so a partial or
 * hand-edited value never throws (CLAUDE.md "normalize before use"). Non-arrays and non-object
 * entries are dropped; a missing id is backfilled; a bad description becomes null.
 *
 * The editable control does NOT run this over what the user is typing — it edits the raw array so
 * half-typed items persist (the feature-130 rule).
 */
export function normalizeAccordionItems(raw: unknown): AccordionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry): AccordionItem[] => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === 'string' && record.id !== '' ? record.id : newAccordionItemId();
    return [
      {
        id,
        title: typeof record.title === 'string' ? record.title : '',
        description: isEditorState(record.description) ? record.description : null,
      },
    ];
  });
}

// ── Labels ──────────────────────────────────────────────────────────────────────────────────────

/** The noun used when the author sets none — "Add item", "No items yet.". */
export const DEFAULT_ITEM_NOUN = 'item';

/**
 * The author's `options.itemLabel`, normalized. Lower-cased because it is always interpolated
 * mid-sentence ("Add question", "Remove question 2"); blank or non-string falls back to "item".
 */
export function itemNoun(itemLabel: unknown): string {
  if (typeof itemLabel !== 'string') {
    return DEFAULT_ITEM_NOUN;
  }
  const trimmed = itemLabel.trim().toLowerCase();
  return trimmed === '' ? DEFAULT_ITEM_NOUN : trimmed;
}

/** Naive English pluralization — enough for a hand-typed noun ("entry" → "entries", "box" → "boxes"). */
export function pluralizeNoun(noun: string): string {
  if (/[^aeiou]y$/.test(noun)) {
    return `${noun.slice(0, -1)}ies`;
  }
  if (/(?:s|x|z|ch|sh)$/.test(noun)) {
    return `${noun}es`;
  }
  return `${noun}s`;
}

/** The add-row text: "Add question". */
export function addItemText(itemLabel: unknown): string {
  return `Add ${itemNoun(itemLabel)} block`;
}

/** The empty-state text: "No questions yet.". */
export function emptyStateText(itemLabel: unknown): string {
  return `No ${pluralizeNoun(itemNoun(itemLabel))} yet.`;
}

/** The hint shown once the author's cap is reached: "Maximum of 4 questions." */
export function atLimitText(itemLabel: unknown, max: number): string {
  const noun = max === 1 ? itemNoun(itemLabel) : pluralizeNoun(itemNoun(itemLabel));
  return `Maximum of ${max} ${noun}.`;
}

/** A row control's accessible name: "Remove question 2" (1-based position). */
export function itemActionLabel(action: string, itemLabel: unknown, index: number): string {
  return `${action} ${itemNoun(itemLabel)} ${index + 1}`;
}

// ── Open state ──────────────────────────────────────────────────────────────────────────────────

/**
 * The item ids the read-only accordion opens on first render. `'first'` and `'all'` are resolved
 * against the actual items, so an empty list always yields an empty selection.
 */
export function resolveDefaultOpen(items: AccordionItem[], mode: unknown): string[] {
  if (items.length === 0) {
    return [];
  }
  if (mode === 'all') {
    return items.map((item) => item.id);
  }
  if (mode === 'first') {
    const first = items[0];
    return first === undefined ? [] : [first.id];
  }
  return [];
}
