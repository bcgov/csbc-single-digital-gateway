import { act } from '@testing-library/react';

// Lexical `SerializedEditorState` fixtures for the doc 250 tests, hand-written like `@repo/forms`' (doc 207): they are
// exactly the shapes a stored document can hold.

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
export const richText = (text = 'Hello world') => root([paragraph([textNode(text)])]);

/** A touched-then-emptied editor: one empty paragraph, no text. */
export const emptyRichText = () => root([paragraph([])]);

/** A state whose only text is whitespace. */
export const blankRichText = () => root([paragraph([textNode('   ')])]);

interface LexicalLike {
  setEditorState: (state: unknown) => void;
  parseEditorState: (json: string) => unknown;
}

/**
 * An edit as Lexical sees one: jsdom cannot type into a `contenteditable`, but a new state set on the surface's own
 * editor runs the update and change listeners typing does. Focus the surface first — a focused editor is never re-seeded.
 */
export function editRichText(surface: Element | null, state: object) {
  // Lexical keeps its editor on the surface under this key.
  const editor =
    surface === null
      ? undefined
      : (Reflect.get(surface, '__lexicalEditor') as LexicalLike | undefined);
  if (!editor) throw new Error('no Lexical editor on that surface');
  act(() => editor.setEditorState(editor.parseEditorState(JSON.stringify(state))));
}
