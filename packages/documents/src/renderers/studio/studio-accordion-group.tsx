import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { nanoid } from 'nanoid';
import type { Ref } from 'react';
import {
  accordionDescription,
  accordionItems,
  accordionTitle,
  itemName,
  moveItem,
  newAccordionItem,
  type AccordionItemValue,
} from '../ui/accordion-model';
import { AccordionItemRow } from './accordion-item-row';
import { InlineRichText } from './inline-rich-text';
import { InlineEditableText } from './inline-text';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';

/** Outranks the ui Accordion group (doc 279 rule 7). */
export const studioAccordionGroupTester = rankWith(2, uiTypeIs('AccordionGroup'));

/**
 * An Accordion group authored on the canvas (doc 279 rules 7-13): the header always drawn — title and rich description
 * edited in place, placeholders when empty — then every item expanded with its own actions, and + Add item last.
 */
export function StudioAccordionGroup({ uischema, visible }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  if (!visible) return null;
  const id = element?.id;
  const editable = (key: string) => editor !== null && id !== undefined && mayEdit(editor, id, key);
  const itemsEditable = editable('content');
  const items = accordionItems(uischema);
  // Rule 11: every item edit writes the whole list.
  const writeItems = (next: readonly AccordionItemValue[]) => {
    if (editor !== null && id !== undefined)
      editor.update(id, { options: { items: next.map(storedItem) } });
  };
  const patchItem = (index: number, patch: Partial<AccordionItemValue>) =>
    writeItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div data-slot="studio-accordion-group" className={`${ELEMENT_INSET} flex flex-col gap-3`}>
      <div className="flex flex-col gap-2">
        <InlineEditableText
          text={accordionTitle(uischema) ?? ''}
          placeholder="Accordion title"
          slot="accordion-title"
          className="text-h6 leading-none font-bold"
          editLabel="Accordion title"
          editable={editable('accordionTitle')}
          onCommit={(next) => {
            if (editor !== null && id !== undefined)
              editor.update(id, { label: next === '' ? undefined : next });
          }}
          render={({ ref, ...rest }) => <div ref={ref as Ref<HTMLDivElement>} {...rest} />}
        />
        <InlineRichText
          value={accordionDescription(uischema)}
          placeholder="Description"
          label="Accordion description"
          slot="accordion-description"
          className="text-sm"
          editable={editable('accordionDescription')}
          onChange={(description) => {
            if (editor !== null && id !== undefined)
              editor.update(id, { options: { description } });
          }}
        />
      </div>
      <div className="rounded-xs border border-border px-3">
        {items.map((item, index) => (
          <AccordionItemRow
            key={item.id}
            item={item}
            name={itemName(item, index)}
            first={index === 0}
            last={index === items.length - 1}
            editable={itemsEditable}
            onTitle={(title) => patchItem(index, { title })}
            onContent={(content) => patchItem(index, { content })}
            onMove={(by) => writeItems(moveItem(items, index, by))}
            onDelete={() => writeItems(items.filter((_, i) => i !== index))}
          />
        ))}
      </div>
      {itemsEditable && (
        <Button
          variant="ghost"
          size="xs"
          className={`${STUDIO_INTERACTIVE} w-full`}
          onClick={(event) => {
            event.stopPropagation();
            writeItems([...items, { ...newAccordionItem(), content: undefined }]);
          }}
        >
          <Icon path={mdiPlus} size="14px" />
          Add item
        </Button>
      )}
    </div>
  );
}

/** An item as stored: a real id (a `#<n>` fallback gets one), its title, and `content` only when it has one. */
function storedItem(item: AccordionItemValue): Record<string, unknown> {
  return {
    id: item.id.startsWith('#') ? nanoid(8) : item.id,
    title: item.title,
    ...(item.content !== undefined && { content: item.content }),
  };
}

export const studioAccordionGroupEntry = {
  tester: studioAccordionGroupTester,
  renderer: withJsonFormsLayoutProps(StudioAccordionGroup),
};
