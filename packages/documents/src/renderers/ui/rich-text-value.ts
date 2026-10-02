import type { RichTextInputProps } from '@repo/ui/rich-text-input';

// Doc 250 rules 1-3 — what rich text IS, and the ONE reader for it in this package. The same rules as `@repo/forms`'
// `rich-text-value.ts` (docs 207, 223), restated because `@repo/documents` imports no forms renderers. The value is a
// Lexical `SerializedEditorState`, never HTML.

/** The editor state, from `@repo/ui`'s prop type, so this package depends on `@repo/ui` and not on Lexical. */
export type RichTextState = NonNullable<RichTextInputProps['value']>;

/** Rule 1: `type: 'object'` whose `required` includes `'root'` — never any object property. */
export function isRichTextProperty(schema: unknown): boolean {
  const s = recordOf(schema);
  const required = s?.['required'];
  return s?.['type'] === 'object' && Array.isArray(required) && required.includes('root');
}

/** Rule 2: `value` as an editor state when its `root` is an object, else `undefined` — malformed state crashes Lexical. */
export function richTextValue(value: unknown): RichTextState | undefined {
  const record = recordOf(value);
  return record !== undefined && recordOf(record['root']) !== undefined
    ? (record as unknown as RichTextState)
    : undefined;
}

/** Rule 3: whether any node carries non-whitespace text. An editor holding none is empty. */
export function richTextHasText(state: RichTextState | undefined): boolean {
  return state !== undefined && hasText(state.root);
}

function hasText(node: unknown): boolean {
  const record = recordOf(node);
  if (record === undefined) return false;
  const text = record['text'];
  if (typeof text === 'string' && text.trim() !== '') return true;
  const children = record['children'];
  return Array.isArray(children) && children.some(hasText);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
