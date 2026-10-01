import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import type { ConditionRow } from '@repo/forms';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { useState } from 'react';
import { BranchEditor } from './branch-editor';
import { DEFAULT_LABEL, nextRowLabel, type CriterionField } from './criteria';
import type { FunnelCondition } from './funnel-model';
import { newRow } from './node-edits';

export interface ConditionDialogProps {
  /** The Condition being edited; `null` keeps the dialog closed. */
  condition: FunnelCondition | null;
  /** What its clauses may test: the fields upstream of it. */
  fields: readonly CriterionField[];
  onSave: (edit: { label: string; rows: ConditionRow[] }) => void;
  onClose: () => void;
}

/** Edits a Condition's branches as a draft; Save applies it, Cancel or Escape discards it. */
export function ConditionDialog({ condition, fields, onSave, onClose }: ConditionDialogProps) {
  return (
    <Dialog open={condition !== null} onOpenChange={(open) => !open && onClose()}>
      {condition !== null && (
        <ConditionEditor
          key={condition.id}
          condition={condition}
          fields={fields}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function ConditionEditor({
  condition,
  fields,
  onSave,
  onClose,
}: ConditionDialogProps & { condition: FunnelCondition }) {
  const [label, setLabel] = useState(condition.label ?? '');
  const [rows, setRows] = useState(condition.options.rows);

  return (
    <DialogContent
      className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
      data-slot="document-studio-condition-dialog"
    >
      <DialogHeader>
        <DialogTitle>Edit condition</DialogTitle>
        <DialogDescription>
          Branches are checked in order and the first that matches is taken. {DEFAULT_LABEL} is
          taken when none do.
        </DialogDescription>
      </DialogHeader>
      <Input
        aria-label="Condition name"
        placeholder="Condition"
        className="h-8 text-sm"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      {fields.length === 0 && (
        <p role="note" className="text-xs text-muted-foreground">
          No fields come before this condition. Add fields to a Form above it to test them here.
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <BranchEditor
            key={row.id}
            row={row}
            position={i + 1}
            fields={fields}
            canRemove={rows.length > 1}
            onChange={(next) => setRows(rows.map((r) => (r.id === row.id ? next : r)))}
            onRemove={() => setRows(rows.filter((r) => r.id !== row.id))}
          />
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => setRows([...rows, newRow(nextRowLabel(rows))])}
      >
        <Icon path={mdiPlus} size="14px" />
        Add branch
      </Button>
      <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{DEFAULT_LABEL}</span> — taken when no branch
        matches.
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ label, rows })}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
