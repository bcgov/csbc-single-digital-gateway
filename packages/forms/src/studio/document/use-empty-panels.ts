import { useEffect, useRef } from 'react';
import { DOCK_PANEL_ORDER, type DockPanel, type DockPanelId } from '../dock-panels';

/**
 * Closes the dock panels while there is no document, and reopens exactly those it closed (doc 200 rules 18-21).
 *
 * This is the THIRD actor over panel visibility, after preview (`use-preview-mode.ts`) and the Flow canvas
 * (`form-studio.tsx`, doc 198 rule 18). Rule 19 orders them session > preview > Flow canvas, and the rule that keeps
 * them from fighting is that each restores ONLY what it hid: a panel the author had already closed stays closed, and
 * a panel another actor is hiding is not reopened here.
 *
 * The ordering holds without any coordination, because the other two actors need a document to exist at all — preview
 * previews one, and the Flow canvas is a document root. So while this hook is hiding, neither of them is.
 *
 * `panels` is read through a ref: `form-studio.tsx` builds it as a fresh object literal every render, so an effect
 * depending on it would run on every keystroke. Only `ready` drives this.
 *
 * TRAP (doc 200 rule 20, inherited from doc 198 rule 18): this hook reads the session status, so it must be declared
 * AFTER that value. A hook reading a `const` declared below it is a temporal dead zone, and the throw takes down every
 * render of the whole shell, not just this path.
 */
export function useEmptyPanels(
  panels: Readonly<Record<DockPanelId, DockPanel>>,
  ready: boolean,
): void {
  const latest = useRef(panels);
  latest.current = panels;
  const hidden = useRef<DockPanelId[]>([]);

  useEffect(() => {
    const current = latest.current;
    if (!ready) {
      // Already hidden by this hook — re-running must not forget the set it has to restore.
      if (hidden.current.length > 0) return;
      hidden.current = DOCK_PANEL_ORDER.filter((id) => current[id].open);
      for (const id of hidden.current) current[id].hide();
      return;
    }
    if (hidden.current.length === 0) return;
    for (const id of hidden.current) current[id].show();
    hidden.current = [];
  }, [ready]);
}
