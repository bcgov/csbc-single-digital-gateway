import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { descriptionState, formDescription, formTitle } from '../default/form-renderer';
import { layoutGap } from '../default/layout-gap';
import { idOf } from './element-order';
import { FORM_DROP_ZONE_SLOT } from './grid-drop-target';
import { InlineEditableHeading } from './inline-heading';
import { InlineRichText } from './inline-rich-text';
import { mayEdit, useStudioEditor } from './studio-editor';
import { StudioVerticalGrid } from './studio-vertical-layout';

/** A root Form's grid listens on the Form's section (doc 238 rule 13b). */
const formZone = (grid: HTMLElement) =>
  grid.closest<HTMLElement>(`[data-slot="${FORM_DROP_ZONE_SLOT}"]`);

/** Outranks the spread default Form (doc 236 rule 39). */
export const studioFormTester = rankWith(2, uiTypeIs('Form'));

/**
 * A Form in the studio (doc 236 rules 39-44): its title, edited inline — a muted "Untitled form" when it has none — then its elements
 * in the shared gridstack grid, which reorders the Form's own `elements` — and, when it has none, is its drop zone
 * (doc 238 rule 17).
 */
export function StudioFormRenderer({ uischema, visible, ...props }: LayoutProps) {
  const editor = useStudioEditor();
  if (!visible) return null;
  const title = formTitle(uischema);
  const description = formDescription(uischema);
  const elements = (uischema as Layout).elements ?? [];
  const id = idOf(uischema);
  return (
    <section
      data-slot={FORM_DROP_ZONE_SLOT}
      aria-label={title ?? 'Untitled form'}
      // The Form's drop zone (doc 238 rule 13b): it fills the page and takes the pointer, so a drag anywhere on the page
      // — above the grid, or below its last item — reaches the root grid. `nodrag`: the page node never moves.
      className={`flex flex-1 flex-col gap-6 ${editor === null ? '' : 'nodrag pointer-events-auto'}`}
    >
      {/* The title edits in place like a Heading (rule 42b); the root Form is never selected. */}
      <InlineEditableHeading
        text={title ?? ''}
        placeholder="Untitled form"
        level={1}
        size={1}
        className="font-semibold"
        slot="form-title"
        editLabel="Form title"
        editable={editor !== null && id !== undefined && mayEdit(editor, id, 'formTitle')}
        onCommit={(next) => {
          if (editor === null || id === undefined) return;
          editor.update(id, { label: next === '' ? undefined : next });
        }}
      />
      {/* Edited in place under the title (doc 251 rules 3-6); the root Form is never selected. */}
      <InlineRichText
        value={descriptionState(description)}
        placeholder="Description"
        label="Form description"
        slot="form-description"
        className="-mt-3 text-muted-foreground"
        editable={editor !== null && id !== undefined && mayEdit(editor, id, 'formDescription')}
        onChange={(next) => {
          if (editor !== null && id !== undefined)
            editor.update(id, { options: { description: next } });
        }}
      />
      {/* Always the grid — empty, it is the Form's drop zone (doc 238 rule 17). */}
      <StudioVerticalGrid
        layoutId={idOf(uischema)}
        dropZone={formZone}
        framedWhenEmpty
        elements={elements}
        gap={layoutGap(uischema.options)}
        schema={props.schema}
        path={props.path}
        enabled={props.enabled}
        renderers={props.renderers}
        cells={props.cells}
      />
    </section>
  );
}

export const studioFormEntry = {
  tester: studioFormTester,
  renderer: withJsonFormsLayoutProps(StudioFormRenderer),
};
