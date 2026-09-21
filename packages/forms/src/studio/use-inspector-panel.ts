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
  /**
   * Doc 209 rule 5: a selected EDGE fills the panel too, so it opens the panel on the same terms. It is
   * namespaced rather than mixed in with element ids — an edge id and an element id are different id-spaces,
   * and one could otherwise read as the other and suppress the open.
   */
  selectedEdgeId: string | null = null,
): InspectorForm | undefined {
  const form = useMemo(
    () => (selectedId === null ? undefined : inspectorFor(selectedId)),
    [inspectorFor, selectedId],
  );

  const openedFor = useRef<string | null>(null);
  const { show } = right;
  const openKey = selectedId ?? (selectedEdgeId === null ? null : `edge:${selectedEdgeId}`);
  useEffect(() => {
    if (openKey === null) {
      openedFor.current = null;
      return;
    }
    if (pressing || openKey === openedFor.current) return;
    openedFor.current = openKey;
    show();
  }, [openKey, pressing, show]);

  return form;
}
