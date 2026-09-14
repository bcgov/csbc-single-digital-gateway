import { useEffect, useMemo, useRef } from 'react';
import type { DockPanel } from './dock-panels';
import type { InspectorForm } from './inspector/inspector-form';

/** What the inspector panel needs from the studio document (`useStudioDocument`). */
export interface InspectableDocument {
  inspectorFor(elementId: string): InspectorForm | undefined;
}

/**
 * The inspector form for the selection, and the right dock panel opening for it (doc 187 rules 14, 26-28).
 *
 * The form is rebuilt only when the document or the selected id changes (`inspectorFor` changes with the
 * document), so JSONForms keeps in-progress input across unrelated re-renders such as hover.
 *
 * When the selection changes to an element the right panel opens — even if the author closed it — but only
 * once no press that started in the studio is held, so a press that becomes a drag opens it after the drop
 * instead of resizing the canvas under the pointer. It opens once per selection (closing it by hand sticks
 * until the selection changes) and never closes.
 */
export function useInspectorPanel(
  { inspectorFor }: InspectableDocument,
  selectedId: string | null,
  pressing: boolean,
  right: DockPanel,
): InspectorForm | undefined {
  const form = useMemo(
    () => (selectedId === null ? undefined : inspectorFor(selectedId)),
    [inspectorFor, selectedId],
  );

  const openedFor = useRef<string | null>(null);
  const { show } = right;
  useEffect(() => {
    if (selectedId === null) {
      openedFor.current = null;
      return;
    }
    if (pressing || selectedId === openedFor.current) return;
    openedFor.current = selectedId;
    show();
  }, [selectedId, pressing, show]);

  return form;
}
