import type { JsonSchema } from '@jsonforms/core';

// Shared Lexical `SerializedEditorState` fixtures for the doc 207 tests. Hand-written rather than produced
// by Lexical, because these are exactly the shapes a hand-authored document can contain.

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
});

const paragraph = (children: object[]) => ({
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
});

const root = (children: object[]) => ({
  root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 },
});

/** A state holding real text. */
export const richText = (text = 'Hello world') => root([paragraph([textNode(text)])]) as never;

/** A touched-then-emptied editor: a real state, one empty paragraph, NO text (rule 5). */
export const emptyRichText = () => root([paragraph([])]) as never;

/** A state whose only text is whitespace — still empty to a reader (rule 5). */
export const blankRichText = () => root([paragraph([textNode('   ')])]) as never;

/** An editor state with no children at all. */
export const bareRichText = () => root([]) as never;

/** A rich text schema property (rule 1). */
export const richTextProperty = (title = 'Background'): JsonSchema =>
  ({ type: 'object', required: ['root'], title }) as JsonSchema;
