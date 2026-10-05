import { mdiArrowLeft, mdiArrowRight, mdiDeleteOutline, mdiDotsVertical } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { moveColumn, removeColumn, setHeader, type TableContent } from '../ui/table-content';
import { InlineTextInput } from './inline-text-input';
import { STUDIO_INTERACTIVE } from './studio-element';

/**
 * A Table header edited in place (doc 265 rules 5-6): its text — blank allowed — and a menu to move or delete the
 * column. The data table's header menu without Type or data key: a Table binds no data.
 */
export function TableHeaderEditor({
  index,
  content,
  onChange,
}: {
  index: number;
  content: TableContent;
  onChange: (content: TableContent) => void;
}) {
  const count = content.headers.length;
  const header = content.headers[index] ?? '';
  const name = header === '' ? `column ${index + 1}` : header;
  return (
    <div data-slot="table-header-editor" className="flex items-center gap-1">
      <InlineTextInput
        value={header}
        label={`Column ${index + 1} header`}
        placeholder="Header"
        allowBlank
        onCommit={(text) => onChange(setHeader(content, index, text))}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className={STUDIO_INTERACTIVE}
              aria-label={`Column options for ${name}`}
            />
          }
        >
          <Icon path={mdiDotsVertical} size="0.875rem" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            disabled={index === 0}
            onClick={() => onChange(moveColumn(content, index, index - 1))}
          >
            <Icon path={mdiArrowLeft} size="0.875rem" aria-hidden />
            Move left
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === count - 1}
            onClick={() => onChange(moveColumn(content, index, index + 1))}
          >
            <Icon path={mdiArrowRight} size="0.875rem" aria-hidden />
            Move right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={count === 1}
            onClick={() => onChange(removeColumn(content, index))}
          >
            <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
