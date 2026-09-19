import { and, schemaMatches, uiTypeIs, type JsonSchema, type Tester } from '@jsonforms/core';
import type { RichTextInputProps } from '@repo/ui/rich-text-input';

// Doc 207 rules 1-5 — what rich content IS. Pure, and the ONE reader: the control, the RichContent display
// element, the Form description and the inspector all come through here, so they can never disagree.
//
// The value is a Lexical `SerializedEditorState`, never HTML. The registered node set IS the safety model
// (doc 37); this package must not introduce an HTML string boundary.

/**
 * The editor state, taken from `@repo/ui`'s own prop type rather than importing `lexical` directly:
 * `@repo/forms` depends on `@repo/ui`, not on Lexical, and one dependency edge is enough.
 */
export type RichTextState = NonNullable<RichTextInputProps['value']>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Rule 1: a rich text property is an object that REQUIRES a `root` — `{ type: 'object', required: ['root'] }`.
 *
 * `type: 'object'` alone would claim every future object-valued field, so a second signal is needed. It is
 * `required: ['root']` rather than a `format`, for two reasons found while building:
 *
 * - Ajv logs `unknown format "rich-text" ignored` on EVERY render for a custom format, and console noise on
 *   every form render is not acceptable. `required` is standard JSON Schema that Ajv already understands.
 * - It is STRUCTURAL, in doc 205's sense: it describes what the value IS — a Lexical state is exactly an
 *   object with a `root` — rather than flagging it. And because Ajv enforces it, a stored value missing its
 *   root fails validation instead of silently rendering as an empty editor.
 *
 * This is what makes Input and Textarea structurally incapable of claiming the field: they match
 * `isStringControl`, which an object can never satisfy.
 */
export const isRichTextProperty = (schema: JsonSchema | undefined): boolean =>
  schema?.type === 'object' && Array.isArray(schema.required) && schema.required.includes('root');

/** Rule 1: a Control bound to a rich text property. */
export const isRichTextControl: Tester = and(
  uiTypeIs('Control'),
  schemaMatches(isRichTextProperty),
);

/**
 * Rules 3-4: `value` as an editor state, or `undefined` when it is anything Lexical cannot seed from.
 *
 * Doc 171 records, unfixed, that a malformed-but-object state CRASHES `RichTextInput`, and `@repo/forms`
 * lets an author hand-write the document in the Monaco code panel (doc 191) — so unlike the legacy builder
 * this is reachable, and `type: 'object'` alone must never be trusted. This guard is what stands between a
 * typo in the code panel and a white screen.
 */
export function richTextValue(value: unknown): RichTextState | undefined {
  if (!isRecord(value)) return undefined;
  return isRecord(value['root']) ? (value as unknown as RichTextState) : undefined;
}

/** Whether any node at or below `node` carries non-whitespace text. */
function hasText(node: unknown): boolean {
  if (!isRecord(node)) return false;
  const text = node['text'];
  if (typeof text === 'string' && text.trim() !== '') return true;
  const children = node['children'];
  return Array.isArray(children) && children.some(hasText);
}

/**
 * Rule 5: whether the state holds no text.
 *
 * An empty editor state is STILL an object, so `required` and `isEmpty` must ask "does it contain text",
 * not "is the key present" — the trap doc 205 rule 29 hit with `[]`, and the one doc 171 records the legacy
 * builder failing (a touched-then-emptied editor passing validation). Whitespace-only counts as empty: it
 * is empty to a reader, which is who the question is about.
 */
export const richTextIsEmpty = (state: RichTextState | undefined): boolean =>
  state === undefined || !hasText(state.root);
