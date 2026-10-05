import { OptionsDialog } from '../../studio/options/options-dialog';
import type { OptionsTarget } from '../../studio/options/options-target';
import { COLUMN_TYPE_NAMES, type TableColumn } from '../ui/object-array';
import type { ColumnOptionEntry } from './column-edit';

/** No Condition ever tests a column (doc 268 rule 5), so the dialog has no clauses to warn about. */
const NO_CLAUSES = Object.freeze({ type: 'Form', elements: [] });

/**
 * A choice column's options in the doc 255 Options dialog (doc 268 rule 5): the column stands in for the field —
 * its options, const type, and multiple for a Multi-select. Renames are not cascaded: nothing references a column.
 */
export function ColumnOptionsDialog({
  elementId,
  column,
  onSave,
  onClose,
}: {
  elementId: string;
  column: TableColumn;
  onSave: (entries: readonly ColumnOptionEntry[]) => void;
  onClose: () => void;
}) {
  const target: OptionsTarget | undefined =
    column.options === undefined || column.choiceType === undefined
      ? undefined
      : {
          elementId: `${elementId}:${column.key}`,
          // Never a property key: the dialog's Condition lookup finds no clause for it.
          propertyKey: `${elementId}:${column.key}`,
          label: column.title,
          fieldName: `${COLUMN_TYPE_NAMES[column.type]} column`,
          multiple: column.type === 'multi-choice',
          options: column.options,
          type: column.choiceType,
        };
  return (
    <OptionsDialog
      target={target}
      uischema={NO_CLAUSES}
      onCancel={onClose}
      onSave={(entries) => {
        onSave(entries);
        onClose();
      }}
    />
  );
}
