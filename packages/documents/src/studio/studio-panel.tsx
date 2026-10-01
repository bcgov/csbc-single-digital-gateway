import { mdiClose } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import type { ReactNode } from 'react';

/**
 * Which of the three forms a panel takes, by the CANVAS's width (doc 233 rule 14) — a container query on the
 * studio's centre (`@container/canvas`), so the panels answer to the room they float in, not the window. At 64rem and
 * up the panel is docked; below it, it collapses to an icon button that opens it expanded over most of the canvas.
 * Literal strings, so Tailwind generates them; keep the three on the same breakpoint.
 */
const AT = {
  docked: '@max-[64rem]/canvas:hidden',
  trigger: '@min-[64rem]/canvas:hidden',
  expanded: '@min-[64rem]/canvas:hidden',
} as const;

const CORNER = { left: 'left-3', right: 'right-3' } as const;

const FRAME =
  'flex flex-col overflow-hidden rounded-md border border-border bg-background shadow-md';

export interface StudioPanelProps {
  /** Names the panel's region and its buttons ("Open inspector", "Close inspector"). */
  label: string;
  /** The heading — e.g. the inspector's current view. */
  title: string;
  /** The collapsed trigger's icon. */
  icon: string;
  side: 'left' | 'right';
  /** The docked width, e.g. `w-64`. */
  width: string;
  /** Controls on the heading's right, before the close button. */
  actions?: ReactNode;
  /** Whether the collapsed panel is open, expanded. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: string;
  /** Extra classes for the docked panel, e.g. a fade-in. */
  className?: string;
  children: ReactNode;
}

/**
 * A floating studio panel (the Palette, the inspector): docked in a top corner of the canvas when there is room;
 * below the breakpoint, an icon button in that corner which opens the panel over most of the canvas, with a close
 * button at the right of its heading. Escape closes it too. The body is rendered by both forms, so any state it
 * shows must live with the caller.
 */
export function StudioPanel({
  label,
  title,
  icon,
  side,
  width,
  actions,
  open,
  onOpenChange,
  slot,
  className = '',
  children,
}: StudioPanelProps) {
  const name = label.toLowerCase();
  return (
    <>
      <section
        aria-label={label}
        data-slot={slot}
        className={`absolute top-3 ${CORNER[side]} z-10 max-h-[calc(100%-1.5rem)] ${width} ${FRAME} ${AT.docked} ${className}`}
      >
        <PanelHeading title={title} actions={actions} />
        {children}
      </section>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Open ${name}`}
        aria-expanded={open}
        data-slot={`${slot}-trigger`}
        className={`absolute top-3 ${CORNER[side]} z-10 bg-background shadow-md ${AT.trigger}`}
        onClick={() => onOpenChange(true)}
      >
        <Icon path={icon} size="16px" />
      </Button>
      {open && (
        <section
          aria-label={label}
          data-slot={`${slot}-expanded`}
          className={`absolute inset-3 z-30 ${FRAME} ${AT.expanded}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onOpenChange(false);
          }}
        >
          <PanelHeading
            title={title}
            actions={
              <>
                {actions}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Close ${name}`}
                  onClick={() => onOpenChange(false)}
                >
                  <Icon path={mdiClose} size="16px" />
                </Button>
              </>
            }
          />
          {children}
        </section>
      )}
    </>
  );
}

function PanelHeading({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border pr-1.5 pl-3">
      <h2 className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</h2>
      {actions}
    </header>
  );
}
