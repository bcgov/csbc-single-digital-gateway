import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';

import { DisplayField } from '../util/display-field';
import { AddressView } from './address-view';

// Read-only counterpart to the editable address control — same tester/rank, renders the value as
// formatted address lines. Used on generic display surfaces (platform preview, version pages).
export const addressDisplayTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'address')),
);

function AddressDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) {
    return null;
  }
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      <AddressView value={data} />
    </DisplayField>
  );
}

export const AddressDisplay = withJsonFormsControlProps(AddressDisplayComponent);
