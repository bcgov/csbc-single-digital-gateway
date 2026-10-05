import type { ControlProps } from '@jsonforms/core';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import type { ReactNode } from 'react';
import { controlDescription } from './control-description';

/** How the table is named and described by its field (doc 263 rule 15). */
export interface DataTableWiring {
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

/**
 * An object array's field (doc 263 rule 15), shared by the read-only and studio tables: label (with a required
 * marker), description, then the table `children` draws from its wiring. A table is not labelable, so the label names
 * it by id rather than `htmlFor`. Renders nothing when hidden.
 */
export function DataTableField({
  props,
  children,
}: {
  props: ControlProps;
  children: (wiring: DataTableWiring) => ReactNode;
}) {
  const { path, id, label, required, uischema, schema, visible } = props;
  if (!visible) return null;
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const labelId = `${id}-label`;
  const table = children({
    ...(label !== '' && { 'aria-labelledby': labelId }),
    ...(description !== undefined && { 'aria-describedby': descriptionId }),
    ...(label === '' && { 'aria-label': path.split('.').at(-1) ?? path }),
  });
  return (
    <Field data-slot="data-table-field" data-component="data-table">
      {label !== '' && (
        <FieldLabel id={labelId}>
          {label}
          {required === true && <span aria-hidden="true"> *</span>}
        </FieldLabel>
      )}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {table}
    </Field>
  );
}
