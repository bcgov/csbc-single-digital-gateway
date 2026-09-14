import { useRef, useState } from 'react';
import { DOCK_PANEL_ORDER, type DockPanel, type DockPanelId } from './dock-panels';

/**
 * Form Studio preview mode (doc 184 rules 6, 10, 14). Entering remembers which dock panels were open
 * and hides them; leaving shows exactly those again, at their remembered sizes. Setting the mode it is
 * already in does nothing.
 */
export function usePreviewMode(panels: Readonly<Record<DockPanelId, DockPanel>>) {
  const [previewing, setPreviewingState] = useState(false);
  const hiddenByPreview = useRef<DockPanelId[]>([]);

  const setPreviewing = (next: boolean) => {
    if (next === previewing) return;
    if (next) {
      hiddenByPreview.current = DOCK_PANEL_ORDER.filter((id) => panels[id].open);
      for (const id of hiddenByPreview.current) panels[id].hide();
    } else {
      for (const id of hiddenByPreview.current) panels[id].show();
      hiddenByPreview.current = [];
    }
    setPreviewingState(next);
  };

  return { previewing, setPreviewing };
}
