import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import type { ReactNode } from 'react';

export interface ActionBarProps {
  /** The bar's `data-slot` (`studio-element-actions`, `document-studio-node-actions`). */
  slot: string;
  /** Names the button group, e.g. "Element actions". */
  label: string;
  /** Visibility classes, which differ between element and node rows (doc 254 rule 4). */
  className?: string;
  /** Marks a node row shown without hover (doc 234 rule 2). */
  shown?: boolean;
  children: ReactNode;
}

/**
 * The studio's action bar (doc 254), in `@repo/forms`' element-toolbar look: a popover-style panel holding a joined
 * group of 24px ghost icon buttons, 8px below the bottom-right corner of what it acts on. INLINE, never portalled, so
 * it sits inside the xyflow viewport transform and scales with the zoom like the card it belongs to. The transparent
 * top padding bridges the gap, so the pointer never leaves the element on its way down.
 */
export function ActionBar({
  slot,
  label,
  className = '',
  shown = false,
  children,
}: ActionBarProps) {
  return (
    <div
      data-slot={slot}
      data-shown={shown || undefined}
      className={`absolute top-full right-0 z-10 pt-2 ${className}`}
    >
      <div
        data-slot="action-bar"
        className="rounded-lg bg-popover p-0.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      >
        <ButtonGroup variant="joined" aria-label={label}>
          {children}
        </ButtonGroup>
      </div>
    </div>
  );
}

export interface ActionBarButtonProps {
  /** Its accessible name and tooltip, naming what it acts on ("Delete Age"). */
  label: string;
  /** An `@mdi/js` path, drawn at 14px. */
  icon: string;
  onClick: () => void;
  /** Delete: drawn in the destructive colour (rule 1). */
  destructive?: boolean;
  /** Extra classes, e.g. xyflow's `nodrag nopan` on a canvas node. */
  className?: string;
  /**
   * Drawn PRESSED — white on BC Gov blue, `aria-pressed` — when what it opens is set (doc 256 rule 9: an element with a
   * rule). Absent: an ordinary action, with no pressed state at all.
   */
  pressed?: boolean;
}

/** The pressed look (doc 256 rule 9), the studio header's pressed mode colours (doc 247). */
const PRESSED =
  'bg-bcgov-blue text-primary-foreground hover:bg-bcgov-blue hover:text-primary-foreground';

/** One action: a ghost `icon-xs` button whose click never reaches the element or node beneath (rule 5). */
export function ActionBarButton({
  label,
  icon,
  onClick,
  destructive = false,
  className = '',
  pressed,
}: ActionBarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      {...(pressed !== undefined && { 'aria-pressed': pressed })}
      className={`${destructive ? 'text-destructive' : ''} ${pressed === true ? PRESSED : ''} ${className}`.trim()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Icon path={icon} size="14px" />
    </Button>
  );
}
