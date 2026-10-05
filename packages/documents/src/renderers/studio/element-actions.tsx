import { propertyAt, refOfScope } from '../../studio/property-ref';
import type { UISchemaElement } from '@jsonforms/core';
import { mdiContentCopy, mdiDeleteOutline, mdiFormatListBulleted, mdiSourceBranch } from '@mdi/js';
import { ActionBar, ActionBarButton } from './action-bar';

/** The action-bar actions an element may have disabled. */
export type ElementAction = 'rule' | 'options' | 'copy' | 'delete';

/** A disabled action's props: disabled, with its reason as the tooltip; nothing for an enabled one. */
const lock = (reason: string | undefined) =>
  reason === undefined ? {} : { disabled: true, title: reason };

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
  disabled = {},
  onEditOptions,
  onCopy,
  onDelete,
}: {
  name: string;
  /** Opens the element's rule dialog (doc 256 rule 9); absent: no Rules action. */
  onEditRule?: (() => void) | undefined;
  /** The element has a rule: Rules is drawn pressed. */
  hasRule?: boolean;
  /**
   * Actions shown but disabled, each with the reason as its tooltip — no field above to test (doc 256 rule 9b), or
   * locked by the template (doc 259 rule 8).
   */
  disabled?: Partial<Record<ElementAction, string>>;
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
          {...lock(disabled.rule)}
          onClick={onEditRule}
        />
      )}
      {onEditOptions !== undefined && (
        <ActionBarButton
          label={`Edit options for ${name}`}
          icon={mdiFormatListBulleted}
          {...lock(disabled.options)}
          onClick={onEditOptions}
        />
      )}
      {onCopy !== undefined && (
        <ActionBarButton
          label={`Copy ${name}`}
          icon={mdiContentCopy}
          {...lock(disabled.copy)}
          onClick={onCopy}
        />
      )}
      {onDelete !== undefined && (
        <ActionBarButton
          label={`Delete ${name}`}
          icon={mdiDeleteOutline}
          destructive
          {...lock(disabled.delete)}
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
  Grid: 'Grid',
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
  // A page field's or a record item field's property (doc 271): its title, else its key.
  const ref = refOfScope(element.scope);
  if (ref !== undefined) {
    const property = isRecord(schema) ? propertyAt(schema, ref) : undefined;
    const title = property?.['title'];
    return typeof title === 'string' && title !== '' ? title : ref.key;
  }
  return TYPE_NAMES[uischema.type] ?? uischema.type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
