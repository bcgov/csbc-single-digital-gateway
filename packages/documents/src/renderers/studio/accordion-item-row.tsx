import { mdiArrowDown, mdiArrowUp, mdiChevronDown, mdiTrashCanOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import { useState, type Ref } from 'react';
import type { AccordionItemValue } from '../ui/accordion-model';
import { richTextHasText, type RichTextState } from '../ui/rich-text-value';
import { InlineRichText } from './inline-rich-text';
import { InlineEditableText } from './inline-text';
import { STUDIO_INTERACTIVE } from './studio-element';

export interface AccordionItemRowProps {
  item: AccordionItemValue;
  /** What the item is called (doc 279 rule 2) — every action's accessible name states it. */
  name: string;
  first: boolean;
  last: boolean;
  /** Whether the template lets the author change the items (rule 12); otherwise texts are read-only, no actions. */
  editable: boolean;
  onTitle: (title: string) => void;
  onContent: (content: RichTextState | undefined) => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
}

/**
 * One accordion item on the canvas (doc 279 rules 8-9): always expanded — its title edited in place above its rich
 * body — with Move up / Move down / Delete at the top right. Deleting an item with text asks first.
 */
export function AccordionItemRow({
  item,
  name,
  first,
  last,
  editable,
  onTitle,
  onContent,
  onMove,
  onDelete,
}: AccordionItemRowProps) {
  const [confirming, setConfirming] = useState(false);
  const hasText = item.title.trim() !== '' || richTextHasText(item.content);
  return (
    <div
      data-slot="accordion-item"
      className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0"
    >
      <div className="flex items-start gap-2">
        <InlineEditableText
          text={item.title}
          placeholder="Item title"
          slot="accordion-item-title"
          className="min-w-0 flex-1 font-semibold"
          editLabel={`Title of ${name}`}
          editable={editable}
          onCommit={onTitle}
          render={({ ref, ...rest }) => <div ref={ref as Ref<HTMLDivElement>} {...rest} />}
        />
        {editable && (
          <div className="flex shrink-0 items-center gap-0.5">
            <ItemAction
              label={`Move ${name} up`}
              icon={mdiArrowUp}
              disabled={first}
              onClick={() => onMove(-1)}
            />
            <ItemAction
              label={`Move ${name} down`}
              icon={mdiArrowDown}
              disabled={last}
              onClick={() => onMove(1)}
            />
            <ItemAction
              label={`Delete ${name}`}
              icon={mdiTrashCanOutline}
              onClick={() => (hasText ? setConfirming(true) : onDelete())}
            />
          </div>
        )}
        {/* Reads as an accordion item although the canvas never collapses one (rule 8). */}
        <Icon
          path={mdiChevronDown}
          size="18px"
          className="mt-0.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <InlineRichText
        value={item.content}
        placeholder="Write the answer…"
        label={`Content of ${name}`}
        slot="accordion-item-content"
        editable={editable}
        onChange={onContent}
      />
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* The name stays out of the title: an FAQ item's own "?" would read "Delete Who can apply??". */}
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>{`“${name}” and its content will be removed.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ItemAction({
  label,
  icon,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`${STUDIO_INTERACTIVE} text-muted-foreground`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Icon path={icon} size="14px" />
    </Button>
  );
}
