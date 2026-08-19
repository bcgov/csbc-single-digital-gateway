import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { normalizeAccordionItems } from '../../jsonforms-renderers/controls/accordion-group/model';
import { DisplayField, EmptyValue } from '../util/display-field';
import { AccordionGroupView } from './accordion-group-view';

// Read-only counterpart to the editable accordion-group control — same tester/rank, renders the
// value as a real @repo/ui AccordionGroup.
export const accordionGroupDisplayTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'accordion-group')),
);

function AccordionGroupDisplayComponent({
  data,
  label,
  description,
  visible,
  uischema,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const options = (uischema.options ?? {}) as Record<string, unknown>;
  // A populated group renders its own header (title + description + expand-all) inside
  // AccordionGroup; an empty one still needs the standard labelled em-dash.
  if (normalizeAccordionItems(data).length === 0) {
    return (
      <DisplayField label={label} {...(description ? { description } : {})}>
        <EmptyValue />
      </DisplayField>
    );
  }
  return (
    <AccordionGroupView
      value={data}
      {...(typeof label === 'string' && label !== '' ? { title: label } : {})}
      {...(description ? { description } : {})}
      defaultOpen={options.defaultOpen}
    />
  );
}

export const AccordionGroupDisplay = withJsonFormsControlProps(AccordionGroupDisplayComponent);
