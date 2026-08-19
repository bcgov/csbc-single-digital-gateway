import { AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { AccordionGroup } from '@repo/ui/accordion-group';
import { RichTextView, type RichTextViewProps } from '@repo/ui/rich-text-view';
import {
  normalizeAccordionItems,
  resolveDefaultOpen,
} from '../../jsonforms-renderers/controls/accordion-group/model';
import { EmptyValue } from '../util/display-field';

export interface AccordionGroupViewProps {
  /** The raw field value — coerced by `normalizeAccordionItems`, so any blob is safe. */
  value: unknown;
  /** Group heading, shown above the sections alongside the expand/collapse-all toggle. */
  title?: string | undefined;
  description?: string | undefined;
  /** Which sections open on first render — the author's `options.defaultOpen`. */
  defaultOpen?: unknown;
}

/**
 * The read-only "accordion group" (feature 171): one collapsible section per item, titled by the
 * item title, with the item's rich-text description as its panel.
 *
 * Exported from `@repo/react/jsonforms-renderers-display` so an app can render the value OUTSIDE a
 * JsonForms dispatch (mirrors `ContactMethodsView` / `AddressView`).
 */
export function AccordionGroupView({
  value,
  title,
  description,
  defaultOpen,
}: AccordionGroupViewProps) {
  const items = normalizeAccordionItems(value);
  if (items.length === 0) {
    return <EmptyValue />;
  }
  return (
    <AccordionGroup
      {...(title === undefined ? {} : { title })}
      {...(description === undefined ? {} : { description })}
      values={items.map((item) => item.id)}
      defaultValue={resolveDefaultOpen(items, defaultOpen)}
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>
            {item.description === null ? (
              <EmptyValue />
            ) : (
              <RichTextView
                value={item.description as Exclude<RichTextViewProps['value'], undefined>}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </AccordionGroup>
  );
}
