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

/**
 * Tailwind class theme applied to rendered rich-text content.
 *
 * SIZE TRAP (doc 207): `packages/ui/src/styles/base.css` sizes bare `p`, `li`, `dd` and `blockquote` at
 * `--app-text-base` in `@layer base`. That is an explicit font-size on the element itself, so it beats
 * anything INHERITED from a container's `text-sm` / `text-xs` — a rich-text paragraph rendered at 16px
 * everywhere, whatever it sat inside. It made rich content 16px beside 14px field descriptions in a
 * fillable form, and defeated the Form Studio inspector's compact density entirely.
 *
 * `text-[length:inherit]` and `leading-[inherit]` put the size back under the CONTAINER's control, which is
 * what lets one component read correctly in a 300px inspector and in a full-width form. Headings already
 * carry explicit sizes, so they were never affected.
 */
const INHERIT_SIZE = 'text-[length:inherit] leading-[inherit]';

export const richTextTheme = {
  paragraph: `mb-1 last:mb-0 ${INHERIT_SIZE}`,
  heading: {
    h1: 'text-2xl font-semibold',
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-semibold',
  },
  list: {
    ul: 'list-disc pl-5',
    ol: 'list-decimal pl-5',
    listitem: `mb-0.5 ${INHERIT_SIZE}`,
  },
  quote: INHERIT_SIZE,
  text: { bold: 'font-semibold', italic: 'italic', underline: 'underline' },
  link: 'text-primary underline',
};
