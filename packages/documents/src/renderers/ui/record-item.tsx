import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { JsonFormsDispatch } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';

type Uischema = Record<string, unknown>;

/** A record Control's item form: its single layout child (doc 271 rule 1), else `undefined`. */
export function itemFormOf(uischema: unknown): Uischema | undefined {
  const elements = (uischema as { elements?: unknown } | undefined)?.elements;
  if (!Array.isArray(elements) || elements.length !== 1) return undefined;
  const form = elements[0] as unknown;
  return typeof form === 'object' && form !== null && !Array.isArray(form)
    ? (form as Uischema)
    : undefined;
}

/**
 * `layout` with every item field's FULL scope (`#/properties/<array>/items/properties/<k>`) made item-relative
 * (`#/properties/<k>`), so it dispatches against ONE item's schema and data path (doc 271 rule 5). Anything else is
 * left as authored.
 */
export function relativeItem(layout: Uischema, array: string): Uischema {
  const prefix = `#/properties/${array}/items/properties/`;
  const scope = layout['scope'];
  const own =
    typeof scope === 'string' && scope.startsWith(prefix)
      ? { ...layout, scope: `#/properties/${scope.slice(prefix.length)}` }
      : layout;
  const elements = own['elements'];
  if (!Array.isArray(elements)) return own;
  return {
    ...own,
    elements: elements.map((child: unknown) =>
      typeof child === 'object' && child !== null && !Array.isArray(child)
        ? relativeItem(child as Uischema, array)
        : child,
    ),
  };
}

/**
 * One item's card (doc 271 rule 5): the item form dispatched against the ITEM schema at `<path>.<index>`, and a
 * Remove item button when removal is allowed.
 */
export function RecordItem({
  form,
  itemSchema,
  path,
  index,
  enabled,
  renderers,
  cells,
  remove,
}: {
  form: Uischema;
  itemSchema: JsonSchema;
  path: string;
  index: number;
  enabled: boolean;
  renderers: ControlProps['renderers'];
  cells: ControlProps['cells'];
  /** Absent: no Remove item. `disabled` at the minimum. */
  remove: { onRemove: () => void; disabled: boolean } | undefined;
}) {
  return (
    <div
      data-slot="record-item"
      className="flex flex-col gap-3 rounded-md border p-4"
      aria-label={`Item ${index + 1}`}
      role="group"
    >
      <JsonFormsDispatch
        uischema={form as unknown as UISchemaElement}
        schema={itemSchema}
        path={`${path}.${index}`}
        enabled={enabled}
        {...(renderers !== undefined && { renderers })}
        {...(cells !== undefined && { cells })}
      />
      {remove !== undefined && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end"
          disabled={remove.disabled}
          onClick={remove.onRemove}
        >
          <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
          Remove item {index + 1}
        </Button>
      )}
    </div>
  );
}
