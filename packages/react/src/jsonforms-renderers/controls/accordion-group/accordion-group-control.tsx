import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { Plus } from 'lucide-react';
import { ControlWrapper } from '../../util/control-wrapper';
import { AccordionItemRow } from './accordion-item-row';
import { itemFieldErrors, messagesForIndex } from './child-errors';
import {
  addItemText,
  emptyAccordionItem,
  emptyStateText,
  normalizeAccordionItems,
  type AccordionItem,
} from './model';

// Dispatched purely by the uischema option `format: 'accordion-group'`, ranked above the generic
// controls — @repo/react has no generic array renderer, and this must not become one.
export const accordionGroupControlTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'accordion-group')),
);

function AccordionGroupControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
  uischema,
}: ControlProps) {
  const ctx = useJsonForms();
  if (visible === false) {
    return null;
  }
  const options = (uischema.options ?? {}) as Record<string, unknown>;
  const itemLabel = options.itemLabel;
  const disabled = enabled === false;
  // JSONForms scopes `errors` to this control's own path, so the item-level failures
  // (`/faq/0/title`) have to be claimed from core (doc 171, rule 16).
  const itemErrors = itemFieldErrors(ctx.core?.errors ?? [], path);

  // The control edits the RAW array so half-typed items persist (the feature-130 rule). Only the
  // render path normalizes — and only enough to guarantee an id for the dnd/React key.
  const raw: AccordionItem[] = Array.isArray(data) ? (data as AccordionItem[]) : [];
  const items = raw.every((item) => typeof item?.id === 'string' && item.id !== '')
    ? raw
    : normalizeAccordionItems(raw);

  const commit = (next: AccordionItem[]) => handleChange(path, next);
  const add = () => commit([...items, emptyAccordionItem()]);
  const remove = (index: number) => commit(items.filter((_, i) => i !== index));
  const patch = (index: number, changes: Partial<AccordionItem>) =>
    commit(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  const moveBy = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) {
      return;
    }
    const next = items.slice();
    const from = next[index];
    const to = next[target];
    if (from === undefined || to === undefined) {
      return;
    }
    next[index] = to;
    next[target] = from;
    commit(next);
  };
  /** Reorder from a completed pointer drag — @dnd-kit returns the new id order for the group. */
  const reorderFromDrag = (ids: unknown) => {
    if (!Array.isArray(ids)) {
      return;
    }
    const byId = new Map(items.map((item) => [item.id, item]));
    const next = ids
      .map((itemId) => byId.get(itemId as string))
      .filter((item): item is AccordionItem => item !== undefined);
    if (next.length === items.length) {
      commit(next);
    }
  };

  const group = `accordion-group-${id}`;
  const rows = items.map((item, index) => (
    <AccordionItemRow
      key={item.id}
      item={item}
      index={index}
      count={items.length}
      group={group}
      itemLabel={itemLabel}
      disabled={disabled}
      errors={messagesForIndex(itemErrors, index)}
      onChange={(changes) => patch(index, changes)}
      onMove={(delta) => moveBy(index, delta)}
      onRemove={() => remove(index)}
    />
  ));

  const list =
    items.length === 0 ? (
      <p className="rounded-lg border border-border px-3 py-6 text-center text-sm text-muted-foreground bg-gray-10">
        {emptyStateText(itemLabel)}
      </p>
    ) : disabled ? (
      <ul className="flex flex-col gap-3">{rows}</ul>
    ) : (
      <DragDropProvider
        onDragEnd={(event) => {
          reorderFromDrag(move({ [group]: items.map((item) => item.id) }, event)[group]);
        }}
      >
        <ul className="flex flex-col gap-3">{rows}</ul>
      </DragDropProvider>
    );

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
      labelFor={false}
    >
      <div className="flex flex-col gap-3">
        {list}
        {/* The add row is always last — a full-width affordance below the item list. It does not
            auto-focus the new row, so it never steals focus from wherever the user was typing. */}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start border-border bg-gray-10 text-sm"
          disabled={disabled}
          onClick={add}
        >
          <Plus aria-hidden />
          {addItemText(itemLabel)}
        </Button>
      </div>
    </ControlWrapper>
  );
}

export const AccordionGroupControl = withJsonFormsControlProps(AccordionGroupControlComponent);
