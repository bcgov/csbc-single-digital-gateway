// Shared Lexical config for the rich-text input (editor) and the rich-text view (read-only render),
// so both deserialize the same node set and style content identically. In a subdir so gen:entries
// (which globs src/inputs/*.tsx) does NOT turn it into a package export.
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import type { Klass, LexicalNode } from 'lexical';

/** Node set both the editor and the viewer register (required to deserialize stored state). */
export const richTextNodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
];

/** Tailwind class theme applied to rendered rich-text content. */
export const richTextTheme = {
  paragraph: 'mb-1 last:mb-0',
  heading: {
    h1: 'text-2xl font-semibold',
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-semibold',
  },
  list: { ul: 'list-disc pl-5', ol: 'list-decimal pl-5', listitem: 'mb-0.5' },
  text: { bold: 'font-semibold', italic: 'italic', underline: 'underline' },
  link: 'text-primary underline',
};
