import { mdiArrowDown, mdiArrowUp, mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Field, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { RichTextInput } from '@repo/ui/rich-text-input';
import { useId } from 'react';
import { richTextHasText, richTextValue, type RichTextState } from './rich-text-value';

/** The two fixed item keys (doc 280 rule 2). */
export const ACCORDION_TITLE_KEY = 'title';
export const ACCORDION_CONTENT_KEY = 'content';

/** What the item inputs are called: the item properties' schema titles, else "Title" / "Content" (doc 280 rule 2). */
export interface AccordionInputLabels {
  title: string;
  content: string;
}

export function accordionInputLabels(schema: unknown): AccordionInputLabels {
  const properties = recordOf(recordOf(recordOf(schema)?.['items'])?.['properties']);
  return {
    title: titleOf(properties?.[ACCORDION_TITLE_KEY]) ?? 'Title',
    content: titleOf(properties?.[ACCORDION_CONTENT_KEY]) ?? 'Content',
  };
}

/** The per-item buttons (doc 280 rule 8); absent on a blank shown item and on the canvas. */
export interface AccordionItemActions {
  onMove: (by: -1 | 1) => void;
  first: boolean;
  last: boolean;
  /** Absent: removal is not allowed. `disabled` at the minimum. */
  remove: { onRemove: () => void; disabled: boolean } | undefined;
}

/**
 * One accordion input item (doc 280 rule 6): a card named `Item <n>` (not shown) holding a Title input over a Content
 * rich editor, each named for its item; the item's actions sit on the Title label's row. An emptied title or content writes `undefined` (rule 7), so `required` fails as elsewhere.
 */
export function AccordionInputItem({
  index,
  row,
  labels,
  enabled,
  onChange,
  actions,
}: {
  index: number;
  row: Record<string, unknown> | undefined;
  labels: AccordionInputLabels;
  enabled: boolean;
  onChange: (key: string, value: unknown) => void;
  actions?: AccordionItemActions | undefined;
}) {
  const id = useId();
  const n = index + 1;
  const title = row?.[ACCORDION_TITLE_KEY];
  return (
    <div
      data-slot="accordion-input-item"
      className="flex flex-col gap-3 rounded-md border p-4"
      role="group"
      aria-label={`Item ${n}`}
    >
      <Field>
        {/* No visible `Item <n>` heading (user): the card is named by `aria-label`, its actions share the label row. */}
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor={`${id}-title`}>{labels.title}</FieldLabel>
          {actions !== undefined && <ItemActions n={n} actions={actions} />}
        </div>
        <Input
          id={`${id}-title`}
          aria-label={`${labels.title}, item ${n}`}
          value={typeof title === 'string' ? title : ''}
          disabled={!enabled}
          onChange={(event) => onChange(ACCORDION_TITLE_KEY, event.target.value || undefined)}
        />
      </Field>
      <Field>
        <FieldLabel>{labels.content}</FieldLabel>
        <RichTextInput
          value={richTextValue(row?.[ACCORDION_CONTENT_KEY]) ?? null}
          disabled={!enabled}
          aria-label={`${labels.content}, item ${n}`}
          onChange={(state: RichTextState) =>
            onChange(ACCORDION_CONTENT_KEY, richTextHasText(state) ? state : undefined)
          }
        />
      </Field>
    </div>
  );
}

function ItemActions({ n, actions }: { n: number; actions: AccordionItemActions }) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move item ${n} up`}
        disabled={actions.first}
        onClick={() => actions.onMove(-1)}
      >
        <Icon path={mdiArrowUp} size="0.875rem" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move item ${n} down`}
        disabled={actions.last}
        onClick={() => actions.onMove(1)}
      >
        <Icon path={mdiArrowDown} size="0.875rem" aria-hidden />
      </Button>
      {actions.remove !== undefined && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove item ${n}`}
          disabled={actions.remove.disabled}
          onClick={actions.remove.onRemove}
        >
          <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function titleOf(property: unknown): string | undefined {
  const title = recordOf(property)?.['title'];
  return typeof title === 'string' && title.trim() !== '' ? title.trim() : undefined;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
