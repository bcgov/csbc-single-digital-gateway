import { mdiArrowRight, mdiFileDocumentOutline, mdiPlus, mdiSourceBranch } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

/** What a + can add (doc 235 rule 2). */
export type AddOption = 'connection' | 'condition' | 'form';

const OPTION_INFO: Readonly<Record<AddOption, { label: string; icon: string }>> = Object.freeze({
  connection: { label: 'Connection', icon: mdiArrowRight },
  condition: { label: 'Condition', icon: mdiSourceBranch },
  form: { label: 'Form', icon: mdiFileDocumentOutline },
});

const HEADING = 'What do you want to add?';

/** Why a disabled option does nothing (doc 235 rule 2b): only Connection is ever disabled. */
const DISABLED_HINT = 'Nothing to connect to';

interface AddPanelProps {
  /** The +'s accessible name, e.g. "Add after Details". */
  label: string;
  options: readonly AddOption[];
  /** Options listed but not choosable (doc 235 rule 2b): marked `aria-disabled`, still reachable by the arrow keys. */
  disabled?: readonly AddOption[];
  onChoose: (option: AddOption) => void;
  /** xyflow's position for the +, on the OUTER wrapper only. */
  style: CSSProperties;
  /** `danger`: the + above a headless Condition, red like its edge; `warning`: above an orphaned Form, orange. */
  tone?: 'default' | 'danger' | 'warning';
  className?: string;
}

/**
 * The + on an edge (doc 235 rules 1-4): a round button that, on click, zooms a menu out over itself asking "What do you
 * want to add?". The zoom runs on the INNER menu: the wrapper carries xyflow's positioning `transform`, which a zoom
 * keyframe would replace (the doc 233 trap). `nodrag nopan` because xyflow pans from any press on the pane.
 */
export function AddPanel({
  label,
  options,
  disabled = [],
  onChoose,
  style,
  tone = 'default',
  className = '',
}: AddPanelProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menu = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  useCloseOnOutsidePress(open, wrapper, () => setOpen(false));
  const shift = useMenuShift(open, trigger, menu);
  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (event.key === 'Escape') {
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    } else if (step !== undefined) {
      event.preventDefault();
      const at = items.current.indexOf(document.activeElement as HTMLButtonElement);
      items.current[(at + step + options.length) % options.length]?.focus();
    }
  };

  return (
    <div
      ref={wrapper}
      data-slot="document-studio-add-panel"
      style={style}
      className={`nodrag nopan pointer-events-auto absolute ${open ? 'z-[2000]' : ''} ${className}`}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex size-6 items-center justify-center rounded-full border bg-background shadow-xs hover:border-ring hover:text-foreground ${TONE[tone]}`}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon path={mdiPlus} size="14px" />
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-labelledby={headingId}
          style={{ top: `calc(50% + ${shift}px)` }}
          className="absolute left-1/2 w-48 -translate-x-1/2 -translate-y-1/2 animate-in rounded-md border border-border bg-background p-1 shadow-md duration-150 fade-in-0 zoom-in-75 motion-reduce:animate-none"
          onKeyDown={onKeyDown}
        >
          <p id={headingId} className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
            {HEADING}
          </p>
          {options.map((option, i) => {
            const off = disabled.includes(option);
            return (
              <button
                key={option}
                ref={(el) => {
                  items.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={off || undefined}
                title={off ? DISABLED_HINT : undefined}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
                onClick={() => {
                  // Disabled: keeps the panel open, so the author sees why nothing happened.
                  if (off) return;
                  close(false);
                  onChoose(option);
                }}
              >
                <Icon
                  path={OPTION_INFO[option].icon}
                  size="16px"
                  className="shrink-0 text-muted-foreground"
                />
                {OPTION_INFO[option].label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Screen-space room a menu keeps from the canvas's top and bottom edges. */
const EDGE_MARGIN = 8;

/**
 * How far (in flow units) to slide a + menu off its centre so it stays inside the canvas (doc 241 rule 4b): xyflow
 * clips the canvas, so a menu centred on a + near the bottom — a root page's trailing + — was cut off under the
 * studio footer. `centre` is the +'s screen y, `height` the menu's unscaled height, `zoom` the canvas zoom.
 */
export function menuShift(
  menu: { centre: number; height: number; zoom: number },
  canvas: { top: number; bottom: number },
): number {
  const half = (menu.height / 2) * menu.zoom;
  const below = menu.centre + half - (canvas.bottom - EDGE_MARGIN);
  if (below > 0) return -below / menu.zoom;
  const above = canvas.top + EDGE_MARGIN - (menu.centre - half);
  return above > 0 ? above / menu.zoom : 0;
}

/** The open menu's `menuShift`, measured from the + (never animated, unlike the menu) before the menu paints. */
function useMenuShift(
  open: boolean,
  trigger: { readonly current: HTMLElement | null },
  menu: { readonly current: HTMLElement | null },
): number {
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const button = trigger.current;
    const canvas = button?.closest('[data-slot="document-studio-canvas"]');
    if (!open || button == null || canvas == null || menu.current === null) return setShift(0);
    const plus = button.getBoundingClientRect();
    const zoom = button.offsetHeight > 0 ? plus.height / button.offsetHeight : 1;
    const bounds = canvas.getBoundingClientRect();
    const centre = plus.top + plus.height / 2;
    setShift(menuShift({ centre, height: menu.current.offsetHeight, zoom }, bounds));
  }, [open, trigger, menu]);
  return shift;
}

const TONE = {
  default: 'border-border text-muted-foreground',
  danger: 'border-danger-border text-danger',
  warning: 'border-warning-border text-warning-text',
} as const;

/** Closes an open popup on any press outside `container` — including on another +, so one panel is open at a time. */
export function useCloseOnOutsidePress(
  open: boolean,
  container: { readonly current: HTMLElement | null },
  onClose: () => void,
) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onPress = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) close.current();
    };
    document.addEventListener('pointerdown', onPress, true);
    return () => document.removeEventListener('pointerdown', onPress, true);
  }, [open, container]);
}
