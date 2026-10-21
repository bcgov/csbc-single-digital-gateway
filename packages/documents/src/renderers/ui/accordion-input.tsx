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
import { useMemo } from 'react';
import { AccordionGroupView } from './accordion-group-renderer';
import { accordionInputLabels, AccordionInputItem } from './accordion-input-item';
import { moveItem, type AccordionItemValue } from './accordion-model';
import { arrayOptions, DEFAULT_ADD_ITEM_LABEL, shownRowCount } from './array-options';
import { DataTableField } from './data-table-field';
import { withCell, withoutRow } from './data-table-cells';
import { isObjectArray, tableRows } from './object-array';
import { richTextValue } from './rich-text-value';

type Row = Record<string, unknown>;

/** An object array presented as an accordion (doc 280 rule 1): disjoint from the record by option, outranks the table. */
export const accordionInputTester = rankWith(
  2,
  and(
    uiTypeIs('Control'),
    optionIs('component', 'accordion'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/** The written items as the Accordion group reads them (doc 280 rule 10): `#<index>` ids, a blank title `Item <n>`. */
export function accordionInputItems(rows: readonly Row[]): AccordionItemValue[] {
  return rows.map((row, index) => ({
    id: `#${index}`,
    title: typeof row['title'] === 'string' ? row['title'] : '',
    content: richTextValue(row['content']),
  }));
}

/**
 * An accordion input (doc 280 rules 4-10): enabled, one item card per shown item — blank ones unwritten until typed
 * into — with Move / Remove on written items and Add item within the authored limits; disabled, the written items read
 * back as a collapsed Accordion group, or a muted dash.
 */
export function AccordionInput(props: ControlProps) {
  const { data, schema, uischema, enabled, handleChange, path } = props;
  const rows = useMemo(() => tableRows(data), [data]);
  const options = useMemo(
    () => arrayOptions(schema, uischema, DEFAULT_ADD_ITEM_LABEL),
    [schema, uischema],
  );
  const labels = useMemo(() => accordionInputLabels(schema), [schema]);
  const write = (next: readonly Row[] | undefined) => handleChange(path, next);
  const shown = shownRowCount(rows.length, options);
  const full = options.maxRows !== undefined && shown >= options.maxRows;
  return (
    <DataTableField props={props} component="accordion">
      {(wiring) =>
        !enabled ? (
          rows.length === 0 ? (
            <p data-slot="accordion-input-empty" className="text-sm text-muted-foreground">
              —
            </p>
          ) : (
            <AccordionGroupView items={accordionInputItems(rows)} />
          )
        ) : (
          <div
            data-slot="accordion-input"
            role="group"
            {...wiring}
            className="flex flex-col items-stretch gap-3"
          >
            {Array.from({ length: shown }, (_, index) => (
              <AccordionInputItem
                key={index}
                index={index}
                row={rows[index]}
                labels={labels}
                enabled
                onChange={(key, value) => write(withCell(rows, index, key, value))}
                actions={
                  index < rows.length
                    ? {
                        onMove: (by) => write(moveItem(rows, index, by)),
                        first: index === 0,
                        last: index === rows.length - 1,
                        remove: options.deleteRows
                          ? {
                              onRemove: () => write(withoutRow(rows, index)),
                              disabled: rows.length <= options.minRows,
                            }
                          : undefined,
                      }
                    : undefined
                }
              />
            ))}
            {options.addRows && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={full}
                onClick={() =>
                  write([...rows, ...Array.from({ length: shown - rows.length + 1 }, () => ({}))])
                }
              >
                <Icon path={mdiPlus} size="0.875rem" aria-hidden />
                {options.addLabel}
              </Button>
            )}
          </div>
        )
      }
    </DataTableField>
  );
}

export const accordionInputEntry = {
  tester: accordionInputTester,
  renderer: withJsonFormsControlProps(AccordionInput),
};
