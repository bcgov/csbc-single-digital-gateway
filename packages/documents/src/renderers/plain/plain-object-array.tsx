import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { AccordionInput } from '../ui/accordion-input';
import { DataTableControl } from '../ui/data-table-control';
import { DataTableField } from '../ui/data-table-field';
import { isObjectArray, tableRows } from '../ui/object-array';
import { RecordControl } from '../ui/record-control';
import { NOT_ANSWERED } from './plain-control';
import { PlainDocumentReferences } from './plain-document-references';

/** An object array read back (doc 282 rules 8-10), above every fill control. */
export const plainObjectArrayTester = rankWith(
  10,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/**
 * Written rows read back through the presentation's own DISABLED renderer — the read-only table, the record's item
 * cards (whose fields dispatch through the plain set), the Accordion group — and none as "Not answered" in the field
 * shell, where each of those would otherwise say something of its own.
 */
export function PlainObjectArray(props: ControlProps) {
  const component = props.uischema.options?.['component'];
  if (!props.visible) return null;
  if (tableRows(props.data).length === 0)
    return (
      <DataTableField
        props={props}
        component={
          component === 'record' || component === 'accordion' || component === 'document-reference'
            ? component
            : 'data-table'
        }
      >
        {() => (
          <div
            data-slot="plain-field-value"
            data-empty=""
            className="text-sm text-muted-foreground italic"
          >
            {NOT_ANSWERED}
          </div>
        )}
      </DataTableField>
    );
  if (component === 'document-reference') return <PlainDocumentReferences {...props} />;
  if (component === 'record') return <RecordControl {...props} />;
  if (component === 'accordion') return <AccordionInput {...props} />;
  return <DataTableControl {...props} />;
}

export const plainObjectArrayEntry = {
  tester: plainObjectArrayTester,
  renderer: withJsonFormsControlProps(PlainObjectArray),
};
