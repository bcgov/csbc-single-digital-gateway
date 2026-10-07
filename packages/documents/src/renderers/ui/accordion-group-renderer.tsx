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
} from './accordion-model';

/** `{ type: 'AccordionGroup' }`, at the base rank (doc 279 rule 4); the studio's outranks it. */
export const accordionGroupTester = rankWith(1, uiTypeIs('AccordionGroup'));

/**
 * An Accordion group read (doc 279 rules 4-6): `@repo/ui` AccordionGroup — its title, the rich description, Expand all
 * — over one item per authored item, opening those the authored mode names. Nothing to show renders nothing.
 */
export function AccordionGroupRenderer({ uischema, visible }: LayoutProps) {
  const items = accordionItems(uischema);
  const title = accordionTitle(uischema);
  const description = accordionDescription(uischema);
  if (!visible || (items.length === 0 && title === undefined && description === undefined))
    return null;
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
        defaultValue={openItemIds(items, accordionDefaultOpen(uischema.options))}
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

export const accordionGroupEntry = {
  tester: accordionGroupTester,
  renderer: withJsonFormsLayoutProps(AccordionGroupRenderer),
};
