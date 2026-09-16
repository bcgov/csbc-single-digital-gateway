import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiDeleteOutline, mdiFileDocumentOutline, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { useContext, type KeyboardEvent } from 'react';
import { labelOf } from '../gridstack/element-label';
import { FORM_TYPE } from '../gridstack/grid-layouts';
import { FlowContext } from './flow-context';
import { useFlowEditor, type FlowEditor } from './flow-editor';
import { elementsOf, STAGE_CHILD_MESSAGE, STAGE_PLACEMENT_MESSAGE } from './flow-elements';

// Doc 196 rule 13: under an editor the card is pointer-events-none (presses fall through to the studio frame, which
// selects and drags the Stage), so the row controls opt back in, and `nodrag` stops xyflow starting a drag from them.
const ROW_CONTROL_CLASS = 'nodrag pointer-events-auto';

interface StageRowProps {
  readonly element: UISchemaElement;
  readonly editor: FlowEditor | null;
}

/** A Form row's name — under an editor, a button that opens the Form (doc 196 rule 13). */
function FormRowName({ element, editor }: StageRowProps) {
  const label = labelOf(element, 'Form');
  const content = (
    <>
      <Icon path={mdiFileDocumentOutline} size="16px" className="shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </>
  );
  if (!editor) return <span className="flex min-w-0 flex-1 items-center gap-1.5">{content}</span>;

  const open = () => editor.onGesture({ type: 'open', formId: editor.idOf(element) });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${label}`}
      data-slot="stage-form-open"
      className={`${ROW_CONTROL_CLASS} flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30`}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      {content}
    </div>
  );
}

/** One child of a Stage card: a Form by its label, anything else by its type, in red. */
function StageRow({ element, editor }: StageRowProps) {
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
      <FormRowName element={element} editor={editor} />
      {editor ? (
        <button
          type="button"
          aria-label={`Delete ${labelOf(element, 'Form')}`}
          data-slot="stage-form-delete"
          className={`${ROW_CONTROL_CLASS} shrink-0 rounded-sm text-muted-foreground hover:text-destructive`}
          onClick={() => editor.onGesture({ type: 'remove', elementId: editor.idOf(element) })}
        >
          <Icon path={mdiDeleteOutline} size="14px" />
        </button>
      ) : null}
    </li>
  );
}

/**
 * The Stage layout renderer (doc 195 rules 13-14). Outside a Flow it renders a placement error. Inside one — dispatched
 * by the Flow's Stage node — a card: the Stage's label, then a row per child in order. The child Forms are listed, never
 * dispatched, so a Stage never renders a Form inside a layout. Under a Flow editor each Form row opens its Form and has a
 * Delete button (doc 196 rules 10, 13).
 */
function StageLayout({ uischema, visible }: LayoutProps) {
  const flow = useContext(FlowContext);
  const editor = useFlowEditor();
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
      ) : null}
      {children.length > 0 || editor ? (
        <ul className="flex flex-col gap-1.5 p-2">
          {children.map((child, index) => (
            <StageRow key={index} element={child} editor={editor} />
          ))}
          {/* Doc 198 rule 13: the palette no longer reaches a Flow, so a Stage adds its own Forms. */}
          {editor ? (
            <li>
              <button
                type="button"
                aria-label="Add form"
                data-slot="stage-add-form"
                className={`${ROW_CONTROL_CLASS} flex w-full items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:border-ring hover:text-foreground`}
                onClick={() =>
                  editor.onGesture({ type: 'add-form', stageId: editor.idOf(uischema) })
                }
              >
                <Icon path={mdiPlus} size="14px" className="shrink-0" />
                <span>Add form</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {invalid ? (
        <div role="alert" className="px-3 pb-2 text-xs text-destructive">
          {STAGE_CHILD_MESSAGE}
        </div>
      ) : null}
    </div>
  );
}

export const StageLayoutRenderer = withJsonFormsLayoutProps(StageLayout);
