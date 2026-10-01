import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { formTitle } from '../default/form-renderer';
import { layoutGap } from '../default/layout-gap';
import { idOf } from './element-order';
import { InlineEditableHeading } from './inline-heading';
import { useStudioEditor } from './studio-editor';
import { StudioVerticalGrid } from './studio-vertical-layout';

/** Outranks the spread default Form (doc 236 rule 39). */
export const studioFormTester = rankWith(2, uiTypeIs('Form'));

/**
 * A Form in the studio (doc 236 rules 39-44): its title, edited inline — a muted "Untitled form" when it has none — then its elements
 * in the shared gridstack grid, which reorders the Form's own `elements`; a muted "No fields yet" when it has none.
 */
export function StudioFormRenderer({ uischema, visible, ...props }: LayoutProps) {
  const editor = useStudioEditor();
  if (!visible) return null;
  const title = formTitle(uischema);
  const elements = (uischema as Layout).elements ?? [];
  const id = idOf(uischema);
  return (
    <section data-slot="form" aria-label={title ?? 'Untitled form'} className="flex flex-col gap-6">
      {/* The title edits in place like a Heading (rule 42b); the root Form is never selected. */}
      <InlineEditableHeading
        text={title ?? ''}
        placeholder="Untitled form"
        level={1}
        size={1}
        className="font-semibold"
        slot="form-title"
        editLabel="Form title"
        editable={editor !== null && id !== undefined}
        onCommit={(next) => {
          if (editor === null || id === undefined) return;
          editor.update(id, { label: next === '' ? undefined : next });
        }}
      />
      {elements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fields yet</p>
      ) : (
        <StudioVerticalGrid
          layoutId={idOf(uischema)}
          elements={elements}
          gap={layoutGap(uischema.options)}
          schema={props.schema}
          path={props.path}
          enabled={props.enabled}
          renderers={props.renderers}
          cells={props.cells}
        />
      )}
    </section>
  );
}

export const studioFormEntry = {
  tester: studioFormTester,
  renderer: withJsonFormsLayoutProps(StudioFormRenderer),
};
