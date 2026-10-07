import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { AccordionGroup } from '@repo/ui/accordion-group';
import { RichTextView } from '@repo/ui/rich-text-view';
import {
  accordionDefaultOpen,
  accordionDescription,
  accordionItems,
  accordionTitle,
  itemName,
  openItemIds,
  type AccordionItemValue,
} from './accordion-model';
import type { RichTextState } from './rich-text-value';

/** `{ type: 'AccordionGroup' }`, at the base rank (doc 279 rule 4); the studio's outranks it. */
export const accordionGroupTester = rankWith(1, uiTypeIs('AccordionGroup'));

/**
 * `@repo/ui` AccordionGroup over `items` (doc 279 rules 4-5) — its title, the rich description, Expand all — opening
 * `open`. Shared by the display element and the accordion input's read-back (doc 280 rule 10).
 */
export function AccordionGroupView({
  items,
  title,
  description,
  open = [],
}: {
  items: readonly AccordionItemValue[];
  title?: string | undefined;
  description?: RichTextState | undefined;
  open?: readonly string[];
}) {
  return (
    <div data-slot="accordion-group">
      <AccordionGroup
        {...(title !== undefined && { title })}
        {...(description !== undefined && {
          description: (
            <div data-slot="accordion-description">
              <RichTextView value={description} />
            </div>
          ),
        })}
        values={items.map((item) => item.id)}
        defaultValue={[...open]}
      >
        {items.map((item, index) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{itemName(item, index)}</AccordionTrigger>
            <AccordionContent>
              <RichTextView value={item.content ?? null} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </AccordionGroup>
    </div>
  );
}

/**
 * An Accordion group read (doc 279 rules 4-6): the view over the authored items, opening those the authored mode
 * names. Nothing to show renders nothing.
 */
export function AccordionGroupRenderer({ uischema, visible }: LayoutProps) {
  const items = accordionItems(uischema);
  const title = accordionTitle(uischema);
  const description = accordionDescription(uischema);
  if (!visible || (items.length === 0 && title === undefined && description === undefined))
    return null;
  return (
    <AccordionGroupView
      items={items}
      title={title}
      description={description}
      open={openItemIds(items, accordionDefaultOpen(uischema.options))}
    />
  );
}

export const accordionGroupEntry = {
  tester: accordionGroupTester,
  renderer: withJsonFormsLayoutProps(AccordionGroupRenderer),
};
