import {
  and,
  optionIs,
  rankWith,
  schemaMatches,
  uiTypeIs,
  type ControlProps,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsControlProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { arrayOptions, DEFAULT_ADD_ITEM_LABEL } from '../ui/array-options';
import { DataTableField } from '../ui/data-table-field';
import { isObjectArray } from '../ui/object-array';
import { itemFormOf } from '../ui/record-item';
import { ELEMENT_INSET } from './studio-element';
import { StudioFillContext } from './studio-fill';

/** Outranks the inert-wrapped ui record (rank 2) in the studio set (doc 271 rule 3). */
export const studioRecordTester = rankWith(
  3,
  and(
    uiTypeIs('Control'),
    optionIs('component', 'record'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/**
 * A record authored on the canvas (doc 271 rule 9): its field shell, then its item form dispatched as-is — full scopes
 * resolve against the ROOT schema — so it is an ordinary studio layout the author drops fields into; under it the
 * Add item button, greyed: the canvas has no answers.
 */
export function StudioRecord(props: ControlProps) {
  const { uischema, schema, rootSchema, renderers, cells } = props;
  const form = itemFormOf(uischema);
  const { addLabel } = arrayOptions(schema, uischema, DEFAULT_ADD_ITEM_LABEL);
  return (
    <div className={ELEMENT_INSET}>
      <DataTableField props={props} component="record">
        {() => (
          <div data-slot="record" className="flex flex-col items-stretch gap-3">
            {form === undefined ? (
              <p className="text-sm text-muted-foreground">This record has no item form.</p>
            ) : (
              <div data-slot="record-item-form" className="rounded-md border border-dashed p-2">
                {/* Doc 281 rule 12: dispatched against the ROOT schema, these fields could write no real answer —
                    they stay inert even on a fillable canvas. */}
                <StudioFillContext value={false}>
                  <JsonFormsDispatch
                    uischema={form as unknown as UISchemaElement}
                    schema={rootSchema}
                    path=""
                    {...(renderers !== undefined && { renderers })}
                    {...(cells !== undefined && { cells })}
                  />
                </StudioFillContext>
              </div>
            )}
            <Button type="button" variant="outline" size="sm" className="self-start" disabled>
              <Icon path={mdiPlus} size="0.875rem" aria-hidden />
              {addLabel}
            </Button>
          </div>
        )}
      </DataTableField>
    </div>
  );
}

export const studioRecordEntry = {
  tester: studioRecordTester,
  renderer: withJsonFormsControlProps(StudioRecord),
};
