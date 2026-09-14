import { mdiContentCopy, mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import { Popover, PopoverContent } from '@repo/ui/popover';
import type { GridItemHTMLElement } from 'gridstack';
import { useCallback, type RefObject } from 'react';
import type { StudioItemPlacement, StudioSelection } from './studio-selection';

interface StudioElementToolbarProps {
  readonly elementId: string;
  readonly open: boolean;
  /** The studio grid item root — the single child of gridstack's item content box. */
  readonly itemRef: RefObject<HTMLElement | null>;
  readonly selection: StudioSelection;
}

/** The item's engine placement at click time (rule 15); authored `gridItem` may lack `x`/`y`. */
function placementOf(itemRef: RefObject<HTMLElement | null>): StudioItemPlacement {
  const node = itemRef.current?.closest<GridItemHTMLElement>('.grid-stack-item')?.gridstackNode;
  return { x: node?.x ?? 0, y: node?.y ?? 0, w: node?.w ?? 1, h: node?.h ?? 1 };
}

/**
 * An element's actions popover (doc 185 rules 9-13): Copy and Delete at the bottom-right of the item's
 * bordered content box. Visibility is driven only by `open` — there is no trigger, focus never moves in
 * or out, and the popover's own outside-press / Escape dismissal is ignored. `data-studio-actions-for`
 * lets the studio treat the pointer over the popover as over its element (rule 4).
 */
export function StudioElementToolbar({
  elementId,
  open,
  itemRef,
  selection,
}: StudioElementToolbarProps) {
  const anchor = useCallback(() => itemRef.current?.parentElement ?? null, [itemRef]);

  return (
    <Popover open={open}>
      <PopoverContent
        anchor={anchor}
        side="bottom"
        align="end"
        sideOffset={4}
        initialFocus={false}
        finalFocus={false}
        aria-label="Element actions"
        data-studio-actions-for={elementId}
        className="w-auto gap-0 p-0.5"
      >
        <ButtonGroup variant="joined">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy"
            onClick={() => selection.copy(elementId, placementOf(itemRef))}
          >
            <Icon path={mdiContentCopy} size="14px" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Delete"
            className="text-destructive"
            onClick={() => selection.requestDelete(elementId)}
          >
            <Icon path={mdiDeleteOutline} size="14px" />
          </Button>
        </ButtonGroup>
      </PopoverContent>
    </Popover>
  );
}
