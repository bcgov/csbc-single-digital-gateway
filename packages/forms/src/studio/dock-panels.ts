import { type RefObject, useCallback, useId, useMemo, useRef, useState } from 'react';
import { type Layout, type PanelImperativeHandle, usePanelRef } from 'react-resizable-panels';

export type DockPanelId = 'left' | 'right' | 'bottom';

export interface DockPanelConfig {
  /** Accessible name of the panel's toggle. */
  readonly label: string;
  readonly defaultOpen: boolean;
  /** Size, as a percentage of the group, a panel opens at until the user resizes it. */
  readonly defaultSize: number;
  /** Percentage below which a dragged panel snaps shut. */
  readonly minSize: number;
}

export const DOCK_PANELS: Readonly<Record<DockPanelId, DockPanelConfig>> = Object.freeze({
  left: Object.freeze({ label: 'Left panel', defaultOpen: true, defaultSize: 20, minSize: 12 }),
  right: Object.freeze({ label: 'Right panel', defaultOpen: false, defaultSize: 20, minSize: 12 }),
  bottom: Object.freeze({
    label: 'Bottom panel',
    defaultOpen: false,
    defaultSize: 25,
    minSize: 15,
  }),
});

/** The order the toggles appear in the header. */
export const DOCK_PANEL_ORDER: readonly DockPanelId[] = Object.freeze(['left', 'bottom', 'right']);

const percent = (value: number): string => `${value}%`;

/** Props spread onto the dock panel's `ResizablePanel`. */
export interface DockPanelProps {
  readonly id: string;
  readonly panelRef: RefObject<PanelImperativeHandle | null>;
  readonly collapsible: true;
  readonly collapsedSize: string;
  readonly minSize: string;
  readonly defaultSize: string;
}

export interface DockPanel {
  readonly id: DockPanelId;
  readonly config: DockPanelConfig;
  readonly open: boolean;
  /** react-resizable-panels panel id — the key of this panel in its group's `Layout`. */
  readonly panelId: string;
  /** DOM id of the panel's content wrapper, referenced by the toggle's `aria-controls`. */
  readonly contentId: string;
  readonly panelRef: RefObject<PanelImperativeHandle | null>;
  readonly panelProps: DockPanelProps;
  toggle: () => void;
  /** Pass the owning group's `onLayoutChanged` layout through (doc 181 rules 12-13). */
  syncLayout: (layout: Layout) => void;
}

/**
 * Open/closed state for one collapsible dock panel (doc 181 rules 10-14).
 *
 * `open` is set directly by `toggle` and reconciled from the owning group's committed layout
 * (`onLayoutChanged`, which fires on pointer release), which is how a drag that snaps the panel shut
 * un-presses its toggle. Panel `onResize` is not used: it fires mid-drag, and closing there would
 * unmount the separator under the pointer. Reopening uses `resize()`, not `expand()`: `expand()`
 * restores `expandToSize ?? minSize`, so a panel that started collapsed would open at its minimum
 * rather than its default size.
 */
export function useDockPanel(id: DockPanelId): DockPanel {
  const config = DOCK_PANELS[id];
  const baseId = useId();
  const panelId = `${baseId}-${id}-panel`;
  const contentId = `${baseId}-${id}-content`;
  const panelRef = usePanelRef();
  const [open, setOpen] = useState(config.defaultOpen);
  const lastOpenSize = useRef(config.defaultSize);

  const toggle = useCallback(() => {
    const panel = panelRef.current;
    if (open) {
      setOpen(false);
      panel?.collapse();
    } else {
      setOpen(true);
      panel?.resize(percent(lastOpenSize.current));
    }
  }, [open, panelRef]);

  // A layout committed at 0 (a drag released below minSize) closes the panel but leaves the
  // pre-drag size remembered for the next reopen.
  const syncLayout = useCallback(
    (layout: Layout) => {
      const size = layout[panelId];
      if (size === undefined) return;
      setOpen(size > 0);
      if (size > 0) lastOpenSize.current = size;
    },
    [panelId],
  );

  const panelProps = useMemo<DockPanelProps>(
    () => ({
      id: panelId,
      panelRef,
      collapsible: true,
      collapsedSize: '0%',
      minSize: percent(config.minSize),
      // Only read at mount; afterwards the panel handle owns the size.
      defaultSize: percent(config.defaultOpen ? config.defaultSize : 0),
    }),
    [config, panelId, panelRef],
  );

  return { id, config, open, panelId, contentId, panelRef, panelProps, toggle, syncLayout };
}
