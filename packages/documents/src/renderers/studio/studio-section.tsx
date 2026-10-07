import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import type { Ref } from 'react';
import { layoutGap } from '../default/layout-gap';
import {
  SECTION_DESCRIPTION_CLASS,
  SECTION_HEADING_CLASS,
  SectionFrame,
  useSectionHeadingLevel,
} from '../default/section-layout';
import { sectionDescription, sectionTitle } from '../ui/section-model';
import { idOf } from './element-order';
import { InlineEditableHeading } from './inline-heading';
import { InlineEditableText } from './inline-text';
import { mayEdit, useStudioEditor } from './studio-editor';
import { useStudioElement } from './studio-element';
import { StudioVerticalGrid } from './studio-vertical-layout';

/** Outranks the default Section (doc 278 rule 12). */
export const studioSectionTester = rankWith(2, uiTypeIs('Section'));

/**
 * A Section authored on the canvas (doc 278 rules 12-13): the header only with a title or description — never a
 * placeholder — each edited in place, then its own elements as an ordinary studio vertical grid — boxed for a container, like the default.
 */
export function StudioSection({ uischema, visible, ...props }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  const level = useSectionHeadingLevel();
  if (!visible) return null;
  const id = element?.id;
  const editable = (key: string) => editor !== null && id !== undefined && mayEdit(editor, id, key);
  const title = sectionTitle(uischema);
  const description = sectionDescription(uischema);
  // Doc 278 rule 12: no placeholders — the header and each line appear only with a value, exactly as when filled in.
  const header = (title !== undefined || description !== undefined) && (
    <div data-slot="section-title" className="flex flex-col gap-1">
      {title !== undefined && (
        <InlineEditableHeading
          text={title}
          placeholder=""
          level={level}
          size={level}
          className={SECTION_HEADING_CLASS}
          slot="section-heading"
          editLabel="Section title"
          editable={editable('sectionTitle')}
          onCommit={(next) => {
            if (editor !== null && id !== undefined)
              editor.update(id, { label: next === '' ? undefined : next });
          }}
        />
      )}
      {description !== undefined && (
        <InlineEditableText
          text={description}
          placeholder=""
          slot="section-description"
          className={SECTION_DESCRIPTION_CLASS}
          editLabel="Section description"
          multiline
          editable={editable('sectionDescription')}
          onCommit={(next) => {
            if (editor !== null && id !== undefined)
              editor.update(id, { options: { description: next === '' ? undefined : next } });
          }}
          render={({ ref, ...rest }) => <p ref={ref as Ref<HTMLParagraphElement>} {...rest} />}
        />
      )}
    </div>
  );
  return (
    <SectionFrame options={uischema.options} header={header}>
      <StudioVerticalGrid
        layoutId={idOf(uischema)}
        elements={(uischema as Layout).elements ?? []}
        gap={layoutGap(uischema.options)}
        schema={props.schema}
        path={props.path}
        enabled={props.enabled}
        renderers={props.renderers}
        cells={props.cells}
      />
    </SectionFrame>
  );
}

export const studioSectionEntry = {
  tester: studioSectionTester,
  renderer: withJsonFormsLayoutProps(StudioSection),
};
