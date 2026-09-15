import { mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Popover, PopoverContent } from '@repo/ui/popover';
import { useCallback, type RefObject } from 'react';
import type { StudioSelection } from './studio-selection';

interface StudioStageActionsProps {
  readonly elementId: string;
  readonly open: boolean;
  /** The Stage's studio frame. */
  readonly frameRef: RefObject<HTMLElement | null>;
  readonly selection: StudioSelection;
}

/**
 * A Stage's actions popover (doc 196 rule 9): Delete only, at the bottom-right of its frame, with the same visibility
 * rules as a grid item's (doc 185 rules 9-13) — driven only by `open`, no focus movement, own dismissal ignored.
 * `data-studio-actions-for` lets the studio treat the pointer over the popover as over its Stage. A Stage is not
 * copied: its Forms would need their data properties re-keyed.
 */
export function StudioStageActions({
  elementId,
  open,
  frameRef,
  selection,
}: StudioStageActionsProps) {
  const anchor = useCallback(() => frameRef.current, [frameRef]);

  return (
    <Popover open={open}>
      <PopoverContent
        anchor={anchor}
        side="bottom"
        align="end"
        sideOffset={4}
        initialFocus={false}
        finalFocus={false}
        aria-label="Stage actions"
        data-studio-actions-for={elementId}
        className="w-auto gap-0 p-0.5"
      >
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Delete"
          className="text-destructive"
          onClick={() => selection.requestDelete(elementId)}
        >
          <Icon path={mdiDeleteOutline} size="14px" />
        </Button>
      </PopoverContent>
    </Popover>
  );
}
