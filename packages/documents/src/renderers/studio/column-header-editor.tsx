import { mdiArrowLeft, mdiArrowRight, mdiDeleteOutline, mdiDotsVertical } from '@mdi/js';
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
import { useEffect, useRef, useState } from 'react';
import {
  COLUMN_TYPE_NAMES,
  COLUMN_TYPES,
  type AuthoredColumnType,
  type TableColumn,
} from '../ui/object-array';
import type { ColumnEdit } from './column-edit';
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
}: {
  column: TableColumn;
  index: number;
  count: number;
  onEdit: (edit: ColumnEdit) => void;
}) {
  const { key, title, type } = column;
  return (
    <div data-slot="column-header-editor" className="flex items-center gap-1">
      <ColumnNameInput
        title={title}
        onRename={(next) => onEdit({ kind: 'rename', key, title: next })}
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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Type</DropdownMenuLabel>
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

/**
 * The column's name, edited in place (rule 21): commits a changed, non-blank name on blur or Enter; Escape or a blank
 * name restores it. Follows a changed title only while it does not have focus, so the author's typing is never reset.
 */
function ColumnNameInput({
  title,
  onRename,
}: {
  title: string;
  onRename: (title: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(title);
  }, [title]);
  const commit = () => {
    const next = draft.trim();
    if (cancelled.current || next === '' || next === title) setDraft(title);
    else onRename(next);
    cancelled.current = false;
  };
  return (
    <input
      ref={input}
      aria-label="Column name"
      value={draft}
      size={Math.max(draft.length, 4)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') input.current?.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          input.current?.blur();
        }
      }}
      className={`${STUDIO_INTERACTIVE} min-w-0 rounded-sm bg-transparent px-1 py-0.5 font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring`}
    />
  );
}
