import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { normalizeContactMethods } from '../../jsonforms-renderers/controls/contact-methods/model';
import { DisplayField, EmptyValue } from '../util/display-field';
import { ContactMethodsView } from './contact-methods-view';

// Read-only counterpart to the editable contact-methods control — same tester/rank, renders the
// value as a list of cards. Used on generic display surfaces (platform preview, version pages).
export const contactMethodsDisplayTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'contact-methods')),
);

function ContactMethodsDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) {
    return null;
  }
  const hasMethods = normalizeContactMethods(data).length > 0;
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {hasMethods ? <ContactMethodsView value={data} /> : <EmptyValue />}
    </DisplayField>
  );
}

export const ContactMethodsDisplay = withJsonFormsControlProps(ContactMethodsDisplayComponent);
