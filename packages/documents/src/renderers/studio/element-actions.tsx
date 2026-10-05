import type { UISchemaElement } from '@jsonforms/core';
import { mdiContentCopy, mdiDeleteOutline, mdiFormatListBulleted, mdiSourceBranch } from '@mdi/js';
import { ActionBar, ActionBarButton } from './action-bar';

/** Why Rules is disabled (doc 256 rule 9b); the inspector says the same. */
export const NO_RULE_SOURCES = 'Add a field above this element to give it a rule';

/**
 * A studio element's action row (doc 242 rule 1, doc 254): the shared action bar below its bottom-right. Shown while the
 * element itself is hovered, the row is focused, or the element is selected; otherwise transparent and ignoring the
 * pointer, but still named. A click never reaches the element, so it does not also select it (rule 3).
 */
export function ElementActions({
  name,
  onEditRule,
  hasRule = false,
  ruleDisabled = false,
  onEditOptions,
  onCopy,
  onDelete,
}: {
  name: string;
  /** Opens the element's rule dialog (doc 256 rule 9); absent: no Rules action. */
  onEditRule?: (() => void) | undefined;
  /** The element has a rule: Rules is drawn pressed. */
  hasRule?: boolean;
  /** No field above the element to test (doc 256 rule 9b): Rules is shown but disabled. */
  ruleDisabled?: boolean;
  /** A choice field's Edit options (doc 255 rule 3); absent for anything else. */
  onEditOptions?: (() => void) | undefined;
  /** Absent: no Copy (the host cannot copy). */
  onCopy?: (() => void) | undefined;
  /** Absent: no Delete (the host cannot delete). */
  onDelete?: (() => void) | undefined;
}) {
  return (
    <ActionBar slot="studio-element-actions" label="Element actions" className={VISIBILITY}>
      {onEditRule !== undefined && (
        <ActionBarButton
          label={`Rules for ${name}`}
          icon={mdiSourceBranch}
          pressed={hasRule}
          disabled={ruleDisabled}
          {...(ruleDisabled && { title: NO_RULE_SOURCES })}
          onClick={onEditRule}
        />
      )}
      {onEditOptions !== undefined && (
        <ActionBarButton
          label={`Edit options for ${name}`}
          icon={mdiFormatListBulleted}
          onClick={onEditOptions}
        />
      )}
      {onCopy !== undefined && (
        <ActionBarButton label={`Copy ${name}`} icon={mdiContentCopy} onClick={onCopy} />
      )}
      {onDelete !== undefined && (
        <ActionBarButton
          label={`Delete ${name}`}
          icon={mdiDeleteOutline}
          destructive
          onClick={onDelete}
        />
      )}
    </ActionBar>
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
  RichContent: 'Rich content',
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
