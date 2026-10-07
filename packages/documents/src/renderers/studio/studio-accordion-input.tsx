import {
  and,
  optionIs,
  rankWith,
  schemaMatches,
  uiTypeIs,
  type ControlProps,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { accordionInputLabels, AccordionInputItem } from '../ui/accordion-input-item';
import { arrayOptions, DEFAULT_ADD_ITEM_LABEL } from '../ui/array-options';
import { AccordionInput } from '../ui/accordion-input';
import { DataTableField } from '../ui/data-table-field';
import { isObjectArray } from '../ui/object-array';
import { useStudioFill } from './studio-fill';

/** Outranks the inert-wrapped ui accordion input (rank 2) in the studio set (doc 280 rule 11). */
export const studioAccordionInputTester = rankWith(
  3,
  and(
    uiTypeIs('Control'),
    optionIs('component', 'accordion'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

const NO_CHANGE = () => {};

/**
 * An accordion input on the canvas (doc 280 rule 11): its field shell, ONE greyed sample item labelled from the
 * schema, and the disabled Add button — the canvas has no answers. A fillable canvas (doc 281) draws the live field.
 */
export function StudioAccordionInput(props: ControlProps) {
  const { schema, uischema } = props;
  const live = useStudioFill();
  const { addLabel } = arrayOptions(schema, uischema, DEFAULT_ADD_ITEM_LABEL);
  // Doc 281 rule 10: a fillable canvas draws the field itself, writing the document's answers.
  if (live) return <AccordionInput {...props} />;
  return (
    <DataTableField props={props} component="accordion">
      {() => (
        <div data-slot="accordion-input" className="flex flex-col items-stretch gap-3">
          <AccordionInputItem
            index={0}
            row={undefined}
            labels={accordionInputLabels(schema)}
            enabled={false}
            onChange={NO_CHANGE}
          />
          <Button type="button" variant="outline" size="sm" className="self-start" disabled>
            <Icon path={mdiPlus} size="0.875rem" aria-hidden />
            {addLabel}
          </Button>
        </div>
      )}
    </DataTableField>
  );
}

export const studioAccordionInputEntry = {
  tester: studioAccordionInputTester,
  renderer: withJsonFormsControlProps(StudioAccordionInput),
};
