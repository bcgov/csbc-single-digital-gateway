import { nanoid } from 'nanoid';
import type { LayoutGap } from '../default/layout-gap';

type Uischema = Record<string, unknown>;

/** `@repo/ui` Card's sizes (doc 273 rule 3). */
export type CardSize = 'default' | 'sm';

/** A Card's two slots (doc 273 rule 1): its first VerticalLayout child is the content, its second the footer. */
export interface CardSlots {
  content?: Uischema;
  footer?: Uischema;
}

/** The Card's VerticalLayout children by position; anything else, and any after the second, is ignored. */
export function cardSlots(element: unknown): CardSlots {
  const elements = recordOf(element)?.['elements'];
  if (!Array.isArray(elements)) return {};
  const [content, footer] = elements
    .map(recordOf)
    .filter((child): child is Uischema => child?.['type'] === 'VerticalLayout');
  return {
    ...(content !== undefined && { content }),
    ...(footer !== undefined && { footer }),
  };
}

/** A Card's `options.size`, `'default'` unless it is `'sm'`. */
export function cardSize(element: unknown): CardSize {
  return optionsOf(element)?.['size'] === 'sm' ? 'sm' : 'default';
}

/** A Card's `options.gap` when it is a known one; absent follows the size (doc 273 rule 4). */
export function cardGap(element: unknown): LayoutGap | undefined {
  const gap = optionsOf(element)?.['gap'];
  return gap === 'sm' || gap === 'md' || gap === 'lg' ? gap : undefined;
}

/** A Card's title: its non-blank `label`, trimmed. */
export function cardTitle(element: unknown): string | undefined {
  return nonBlank(recordOf(element)?.['label']);
}

/** A Card's description: its non-blank plain-text `options.description`, trimmed. */
export function cardDescription(element: unknown): string | undefined {
  return nonBlank(optionsOf(element)?.['description']);
}

/** A new empty slot, fresh every call. */
export function newCardSlot(): Uischema {
  return { id: nanoid(8), type: 'VerticalLayout', elements: [] };
}

function optionsOf(element: unknown): Uischema | undefined {
  return recordOf(recordOf(element)?.['options']);
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function recordOf(value: unknown): Uischema | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Uischema)
    : undefined;
}
