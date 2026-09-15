import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiFileDocumentOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { useContext } from 'react';
import { FORM_TYPE } from '../gridstack/grid-layouts';
import { FlowContext } from './flow-context';
import { elementsOf, STAGE_CHILD_MESSAGE, STAGE_PLACEMENT_MESSAGE } from './flow-elements';

/** An element's `label` when a non-empty string, else `fallback`. */
function labelOf(element: UISchemaElement, fallback: string): string {
  const label = (element as { label?: unknown }).label;
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : fallback;
}

/** One child of a Stage card: a Form by its label, anything else by its type, in red. */
function StageRow({ element }: { readonly element: UISchemaElement }) {
  if (element.type !== FORM_TYPE) {
    return (
      <li data-slot="stage-invalid-row" className="px-2 py-1 text-sm text-destructive">
        {element.type}
      </li>
    );
  }
  return (
    <li
      data-slot="stage-form-row"
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-sm"
    >
      <Icon path={mdiFileDocumentOutline} size="16px" className="shrink-0 text-muted-foreground" />
      <span className="truncate">{labelOf(element, 'Form')}</span>
    </li>
  );
}

/**
 * The Stage layout renderer (doc 195 rules 13-14). Outside a Flow it renders a placement error. Inside one — dispatched
 * by the Flow's Stage node — a card: the Stage's label, then a row per child in order. The child Forms are listed, never
 * dispatched, so a Stage never renders a Form inside a layout.
 */
function StageLayout({ uischema, visible }: LayoutProps) {
  const flow = useContext(FlowContext);
  if (!flow) {
    return (
      <p role="alert" data-slot="stage-placement-error" className="text-sm text-destructive">
        {STAGE_PLACEMENT_MESSAGE}
      </p>
    );
  }
  if (!visible) return null;
  const children = elementsOf(uischema);
  const invalid = children.some((child) => child.type !== FORM_TYPE);
  return (
    <div
      data-slot="stage-card"
      className="w-64 rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <div data-slot="stage-label" className="border-b px-3 py-2 text-sm font-semibold">
        {labelOf(uischema, 'Stage')}
      </div>
      {children.length === 0 ? (
        <div data-slot="stage-empty" className="p-3 text-sm text-muted-foreground">
          No forms
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 p-2">
          {children.map((child, index) => (
            <StageRow key={index} element={child} />
          ))}
        </ul>
      )}
      {invalid ? (
        <div role="alert" className="px-3 pb-2 text-xs text-destructive">
          {STAGE_CHILD_MESSAGE}
        </div>
      ) : null}
    </div>
  );
}

export const StageLayoutRenderer = withJsonFormsLayoutProps(StageLayout);
