import {
  and,
  optionIs,
  rankWith,
  schemaMatches,
  uiTypeIs,
  type ControlProps,
  type JsonSchema,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { useMemo } from 'react';
import { arrayOptions, DEFAULT_ADD_ITEM_LABEL, shownRowCount } from './array-options';
import { DataTableField } from './data-table-field';
import { withoutRow } from './data-table-cells';
import { isObjectArray, tableRows } from './object-array';
import { itemFormOf, RecordItem, relativeItem } from './record-item';

/** An object array presented as a record (doc 271 rule 3): outranks the data table, which takes every other. */
export const recordControlTester = rankWith(
  2,
  and(
    uiTypeIs('Control'),
    optionIs('component', 'record'),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/** The bound array's key, from the Control's `#/properties/<key>` scope. */
export function arrayKeyOf(uischema: unknown): string | undefined {
  const scope = (uischema as { scope?: unknown } | undefined)?.scope;
  return typeof scope === 'string' ? /^#\/properties\/([^/]+)$/.exec(scope)?.[1] : undefined;
}

/**
 * A record (doc 271 rules 5-8): one card per item, at least max(1, minRows) shown — blank ones unwritten until typed
 * into — each filled through the item form; Add item / Remove item within the authored limits. Disabled, the cards
 * draw disabled with no Add / Remove.
 */
export function RecordControl(props: ControlProps) {
  const { data, schema, uischema, enabled, handleChange, path, renderers, cells } = props;
  const rows = useMemo(() => tableRows(data), [data]);
  const options = useMemo(
    () => arrayOptions(schema, uischema, DEFAULT_ADD_ITEM_LABEL),
    [schema, uischema],
  );
  const array = arrayKeyOf(uischema);
  const form = useMemo(() => {
    const authored = itemFormOf(uischema);
    return authored === undefined || array === undefined
      ? undefined
      : relativeItem(authored, array);
  }, [uischema, array]);
  const itemSchema = (schema as { items?: JsonSchema }).items ?? {};
  const shown = shownRowCount(rows.length, options);
  const full = options.maxRows !== undefined && shown >= options.maxRows;
  return (
    <DataTableField props={props} component="record">
      {() =>
        form === undefined ? (
          <p className="text-sm text-muted-foreground">This record has no item form.</p>
        ) : (
          <div data-slot="record" className="flex flex-col items-stretch gap-3">
            {Array.from({ length: shown }, (_, index) => (
              <RecordItem
                key={index}
                form={form}
                itemSchema={itemSchema}
                path={path}
                index={index}
                enabled={enabled}
                renderers={renderers}
                cells={cells}
                remove={
                  enabled && options.deleteRows && index < rows.length
                    ? {
                        onRemove: () => handleChange(path, withoutRow(rows, index)),
                        disabled: rows.length <= options.minRows,
                      }
                    : undefined
                }
              />
            ))}
            {enabled && options.addRows && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={full}
                onClick={() =>
                  handleChange(path, [
                    ...rows,
                    ...Array.from({ length: shown - rows.length + 1 }, () => ({})),
                  ])
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

export const recordControlEntry = {
  tester: recordControlTester,
  renderer: withJsonFormsControlProps(RecordControl),
};
