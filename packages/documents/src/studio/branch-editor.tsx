import { mdiClose, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import type { ConditionRow } from '@repo/forms';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { ClauseFields } from './clause-fields';
import { clauseFor, type CriterionField } from './criteria';
import { newId } from './element-ids';

/** One branch in the condition dialog: its name, how its clauses combine, and the clauses themselves. */
export function BranchEditor({
  row,
  position,
  fields,
  canRemove,
  onChange,
  onRemove,
}: {
  row: ConditionRow;
  position: number;
  fields: readonly CriterionField[];
  canRemove: boolean;
  onChange: (row: ConditionRow) => void;
  onRemove: () => void;
}) {
  const first = fields[0];
  return (
    <li
      data-slot="document-studio-branch"
      aria-label={`Branch ${position}`}
      className="flex flex-col gap-2 rounded-md border border-border p-3"
    >
      <div className="flex items-center gap-2">
        <Input
          aria-label="Branch name"
          className="h-7 flex-1 text-xs"
          value={row.label}
          onChange={(event) => onChange({ ...row, label: event.target.value })}
        />
        <NativeSelect
          aria-label="Match"
          value={row.match}
          onChange={(event) =>
            onChange({ ...row, match: event.target.value === 'any' ? 'any' : 'all' })
          }
        >
          <NativeSelectOption value="all">Match all</NativeSelectOption>
          <NativeSelectOption value="any">Match any</NativeSelectOption>
        </NativeSelect>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove branch ${position}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Icon path={mdiClose} size="14px" />
        </Button>
      </div>
      {row.clauses.map((clause) => (
        <div key={clause.id} className="flex items-start gap-2">
          <ClauseFields
            clause={clause}
            fields={fields}
            onChange={(next) =>
              onChange({ ...row, clauses: row.clauses.map((c) => (c.id === clause.id ? next : c)) })
            }
          />
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Remove clause"
            onClick={() =>
              onChange({ ...row, clauses: row.clauses.filter((c) => c.id !== clause.id) })
            }
          >
            <Icon path={mdiClose} size="14px" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        className="self-start"
        disabled={first === undefined}
        onClick={() =>
          first !== undefined &&
          onChange({ ...row, clauses: [...row.clauses, clauseFor(first, newId())] })
        }
      >
        <Icon path={mdiPlus} size="12px" />
        Add clause
      </Button>
    </li>
  );
}
