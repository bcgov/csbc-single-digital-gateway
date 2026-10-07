import { nanoid } from 'nanoid';
import { richTextValue, type RichTextState } from './rich-text-value';

// An Accordion group's authored settings (doc 279 rules 1-3): pure, React-free readers the renderers and the inspector
// share. Every reader falls back rather than throwing — the uischema is hand-authored JSON.

/** One item as read for rendering (rule 1). */
export interface AccordionItemValue {
  id: string;
  title: string;
  content: RichTextState | undefined;
}

/** Rule 3: which items start open in the default renderer. */
export type AccordionDefaultOpen = 'none' | 'first' | 'all';

/** Rule 15: the inspector's choices, in order. */
export const DEFAULT_OPEN_CHOICES: ReadonlyArray<readonly [AccordionDefaultOpen, string]> =
  Object.freeze([
    ['none', 'None'],
    ['first', 'First item'],
    ['all', 'All items'],
  ] as const);

export const DEFAULT_ACCORDION_OPEN: AccordionDefaultOpen = 'none';

/** Rule 1: `options.items`, sanitised — bad entries dropped, a blank id read as `#<index>`, never throwing. */
export function accordionItems(element: unknown): AccordionItemValue[] {
  const items = optionsOf(element)?.['items'];
  if (!Array.isArray(items)) return [];
  return items.flatMap((entry: unknown, index): AccordionItemValue[] => {
    const item = recordOf(entry);
    if (item === undefined) return [];
    const id = item['id'];
    const title = item['title'];
    return [
      {
        id: typeof id === 'string' && id.trim() !== '' ? id : `#${index}`,
        title: typeof title === 'string' ? title : '',
        content: richTextValue(item['content']),
      },
    ];
  });
}

/** Rule 2: what an item is called — its trimmed title, else `Item <n>`. */
export function itemName(item: AccordionItemValue, index: number): string {
  const title = item.title.trim();
  return title === '' ? `Item ${index + 1}` : title;
}

/** The group's title: its non-blank `label`, trimmed. */
export function accordionTitle(element: unknown): string | undefined {
  const label = recordOf(element)?.['label'];
  if (typeof label !== 'string') return undefined;
  const trimmed = label.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** The group's rich `options.description`, when Lexical can seed from it. */
export function accordionDescription(element: unknown): RichTextState | undefined {
  return richTextValue(optionsOf(element)?.['description']);
}

/** Rule 3: `options.defaultOpen` when it is one of the three, else `none`. Takes the element's `options`. */
export function accordionDefaultOpen(options: unknown): AccordionDefaultOpen {
  const mode = recordOf(options)?.['defaultOpen'];
  return DEFAULT_OPEN_CHOICES.some(([value]) => value === mode)
    ? (mode as AccordionDefaultOpen)
    : DEFAULT_ACCORDION_OPEN;
}

/** Rule 3: the ids `mode` opens. */
export function openItemIds(
  items: readonly AccordionItemValue[],
  mode: AccordionDefaultOpen,
): string[] {
  if (mode === 'all') return items.map((item) => item.id);
  if (mode === 'first' && items[0] !== undefined) return [items[0].id];
  return [];
}

/** Rule 10: a new empty item — a fresh id, a blank title, no content key. */
export function newAccordionItem(): { id: string; title: string } {
  return { id: nanoid(8), title: '' };
}

/** Rule 9: `list` with the entry at `index` moved by `by`; the same array when either end is out of range. */
export function moveItem<T>(list: readonly T[], index: number, by: -1 | 1): readonly T[] {
  const to = index + by;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved as T);
  return next;
}

function optionsOf(element: unknown): Record<string, unknown> | undefined {
  return recordOf(recordOf(element)?.['options']);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
