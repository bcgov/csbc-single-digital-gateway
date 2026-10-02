import type { UISchemaElement } from '@jsonforms/core';
import { mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';

/**
 * A studio element's action row (doc 242 rule 1): square icon buttons just below its bottom-right corner, the canvas
 * node actions' look (doc 234). Shown while the element itself is hovered, the row is focused, or the element is selected;
 * otherwise transparent and ignoring the pointer, but still named. The top padding bridges the gap to the element.
 * A click never reaches the element, so it does not also select it (rule 3).
 */
export function ElementActions({ name, onDelete }: { name: string; onDelete: () => void }) {
  return (
    <div
      data-slot="studio-element-actions"
      className={`absolute top-full right-0 z-10 flex gap-0.5 pt-1.5 ${VISIBILITY}`}
    >
      <button
        type="button"
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        className="flex size-4 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground shadow-xs hover:text-destructive"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Icon path={mdiDeleteOutline} size="12px" />
      </button>
    </div>
  );
}

/**
 * Variants on the row's PARENT (the element) only, never `group-*`: elements nest, and a group variant would show
 * every enclosing element's row too. Hover counts only when no nested element is hovered; focus is the row's own.
 */
const VISIBILITY =
  'pointer-events-none opacity-0 transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 [[data-selected]>&]:pointer-events-auto [[data-selected]>&]:opacity-100 [:hover:not(:has([data-slot=studio-element]:hover))>&]:pointer-events-auto [:hover:not(:has([data-slot=studio-element]:hover))>&]:opacity-100';

const TYPE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  VerticalLayout: 'Vertical layout',
  HorizontalLayout: 'Horizontal layout',
  Heading: 'Heading',
  Separator: 'Separator',
  Control: 'Field',
});

/**
 * What an element is called on its actions (doc 242 rule 2): its label, else a Heading's text, else — for a Control —
 * its property's schema title or key, else a readable type.
 */
export function elementName(uischema: UISchemaElement, schema: unknown): string {
  const element = uischema as UISchemaElement & { label?: unknown; scope?: unknown };
  if (typeof element.label === 'string' && element.label !== '') return element.label;
  const text = element.options?.['text'];
  if (typeof text === 'string' && text !== '') return text;
  const key =
    typeof element.scope === 'string'
      ? /^#\/properties\/([^/]+)$/.exec(element.scope)?.[1]
      : undefined;
  if (key !== undefined) {
    const properties = (schema as { properties?: Record<string, { title?: unknown }> } | undefined)
      ?.properties;
    const title = properties?.[key]?.title;
    return typeof title === 'string' && title !== '' ? title : key;
  }
  return TYPE_NAMES[uischema.type] ?? uischema.type;
}
