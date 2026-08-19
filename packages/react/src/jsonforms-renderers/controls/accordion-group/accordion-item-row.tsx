import { useSortable } from '@dnd-kit/react/sortable';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { RichTextInput, type RichTextInputProps } from '@repo/ui/rich-text-input';
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import { itemActionLabel, type AccordionItem } from './model';

// Reorder gaps open instantly; the slide animation is off. NOTE: `transition: null` does NOT work —
// @dnd-kit spreads `{...defaultSortableTransition, ...input.transition}` and spreading null is a
// no-op. `duration: 0` is the real "no animation" path. (Same note as the form-builder field rows.)
const NO_SLIDE = { transition: { duration: 0 } } as const;

export interface AccordionItemRowProps {
  item: AccordionItem;
  index: number;
  count: number;
  /** The dnd group id — unique per control instance so two fields on one page never cross-drop. */
  group: string;
  /** The author's `options.itemLabel`; drives every accessible name on the row. */
  itemLabel: unknown;
  disabled: boolean;
  onChange: (patch: Partial<AccordionItem>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}

/** The visual body of one item editor. `handleRef` wires the drag grip when reordering is enabled. */
function ItemRowBody({
  item,
  index,
  count,
  itemLabel,
  disabled,
  onChange,
  onMove,
  onRemove,
  handleRef,
}: Omit<AccordionItemRowProps, 'group'> & { handleRef?: (element: Element | null) => void }) {
  const titleId = `${item.id}-title`;
  const descriptionId = `${item.id}-description`;
  // The rich-text editor is a Lexical ContentEditable (a div) — `<label for>` cannot name it, so the
  // caption carries an id and the editor points at it with aria-labelledby.
  const descriptionLabelId = `${descriptionId}-label`;
  const nameFor = (action: string) => itemActionLabel(action, itemLabel, index);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={handleRef}
          disabled={disabled}
          aria-label={nameFor('Reorder')}
          className="cursor-grab rounded-md p-1 text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={nameFor('Move up')}
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={nameFor('Move down')}
            disabled={disabled || index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={nameFor('Remove')}
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={titleId} className="font-medium">
          Title
        </Label>
        <Input
          id={titleId}
          value={item.title}
          readOnly={disabled}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label id={descriptionLabelId} className="font-medium">
          Description
        </Label>
        <RichTextInput
          id={descriptionId}
          aria-labelledby={descriptionLabelId}
          value={(item.description ?? null) as Exclude<RichTextInputProps['value'], undefined>}
          disabled={disabled}
          onChange={(value) => onChange({ description: value })}
        />
      </div>
    </div>
  );
}

/**
 * One accordion item editor, sortable by pointer drag (feature 171). The Move up / Move down buttons
 * in the body are the keyboard- and screen-reader-accessible reorder path and stay available whether
 * or not a drag is possible — they are also the only path jsdom can exercise.
 *
 * When `disabled` (the control is readonly — e.g. the form-builder canvas preview) the row renders
 * without `useSortable` at all, so a readonly preview is never draggable.
 */
export function AccordionItemRow({ group, ...props }: AccordionItemRowProps) {
  if (props.disabled) {
    return (
      <li className="list-none">
        <ItemRowBody {...props} />
      </li>
    );
  }
  return <SortableItemRow group={group} {...props} />;
}

function SortableItemRow({ group, ...props }: AccordionItemRowProps) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: props.item.id,
    index: props.index,
    group,
    type: 'accordion-item',
    ...NO_SLIDE,
  });
  return (
    <li ref={ref} data-dragging={isDragSource || undefined} className="list-none">
      <ItemRowBody {...props} handleRef={handleRef} />
    </li>
  );
}
