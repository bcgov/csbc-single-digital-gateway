import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiDeleteOutline,
  mdiDotsVertical,
  mdiKeyVariant,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useState } from 'react';
import {
  COLUMN_TYPE_NAMES,
  COLUMN_TYPES,
  type AuthoredColumnType,
  type TableColumn,
} from '../ui/object-array';
import type { ColumnEdit } from './column-edit';
import { ColumnKeyDialog } from './column-key-dialog';
import { InlineTextInput } from './inline-text-input';
import { STUDIO_INTERACTIVE } from './studio-element';

const isAuthoredType = (value: unknown): value is AuthoredColumnType =>
  COLUMN_TYPES.includes(value as AuthoredColumnType);

/**
 * One editable column header (doc 263 rules 20-22): the column's name in place, and a menu to retype, move or delete
 * it. Every edit leaves through `onEdit`; nothing here writes.
 */
export function ColumnHeaderEditor({
  column,
  index,
  count,
  onEdit,
  keyProblem,
}: {
  column: TableColumn;
  index: number;
  count: number;
  onEdit: (edit: ColumnEdit) => void;
  /** Why the column can't take a data key (doc 264 rule 10). */
  keyProblem: (from: string, to: string) => string | undefined;
}) {
  const { key, title, type } = column;
  const [rekeying, setRekeying] = useState(false);
  return (
    <div data-slot="column-header-editor" className="flex items-center gap-1">
      {rekeying && (
        <ColumnKeyDialog
          title={title}
          columnKey={key}
          problem={(to) => keyProblem(key, to)}
          onSave={(to) => {
            onEdit({ kind: 'rekey', key, to });
            setRekeying(false);
          }}
          onClose={() => setRekeying(false)}
        />
      )}
      <InlineTextInput
        value={title}
        label="Column name"
        onCommit={(next) => onEdit({ kind: 'rename', key, title: next })}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className={STUDIO_INTERACTIVE}
              aria-label={`Column options for ${title}`}
            />
          }
        >
          <Icon path={mdiDotsVertical} size="0.875rem" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 text-xs">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs">Type</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={type}
              onValueChange={(next) => {
                if (isAuthoredType(next) && next !== type)
                  onEdit({ kind: 'retype', key, type: next });
              }}
            >
              {COLUMN_TYPES.map((option) => (
                <DropdownMenuRadioItem key={option} value={option} closeOnClick>
                  {COLUMN_TYPE_NAMES[option]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setRekeying(true)}>
            <Icon path={mdiKeyVariant} size="0.875rem" aria-hidden />
            Change data key…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === 0}
            onClick={() => onEdit({ kind: 'move', key, to: index - 1 })}
          >
            <Icon path={mdiArrowLeft} size="0.875rem" aria-hidden />
            Move left
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === count - 1}
            onClick={() => onEdit({ kind: 'move', key, to: index + 1 })}
          >
            <Icon path={mdiArrowRight} size="0.875rem" aria-hidden />
            Move right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={count === 1}
            onClick={() => onEdit({ kind: 'remove', key })}
          >
            <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
