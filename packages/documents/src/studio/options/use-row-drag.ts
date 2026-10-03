import { useState } from 'react';
import { dropIndex, moveOption, type DropEdge, type Option } from './option-draft';

/** A drag in flight: the row carried, and the row and edge it is over (doc 255 rule 5b). */
interface RowDrag {
  fromId: string;
  overId?: string;
  edge?: DropEdge;
}

/**
 * Doc 255 rule 5b: the options dialog's row drag. It tracks the row being carried and where it would land, gives each
 * row what it draws (faded while carried, a line on the edge it would land on), and moves the row on drop through the
 * pure `dropIndex` / `moveOption`. No line is drawn on the carried row, nor where a drop would change nothing.
 */
export function useRowDrag(draft: readonly Option[], setDraft: (draft: Option[]) => void) {
  const [drag, setDrag] = useState<RowDrag | null>(null);
  const indexOf = (id: string | undefined) => draft.findIndex((row) => row.id === id);

  const dragOver = (overId: string, edge: DropEdge) =>
    setDrag((current) =>
      current === null || (current.overId === overId && current.edge === edge)
        ? current
        : { ...current, overId, edge },
    );
  const drop = () => {
    const from = indexOf(drag?.fromId);
    const over = indexOf(drag?.overId);
    if (drag?.edge !== undefined && from !== -1 && over !== -1)
      setDraft(moveOption(draft, from, dropIndex(from, over, drag.edge)));
    setDrag(null);
  };
  const lineOn = (id: string): DropEdge | undefined => {
    if (drag === null || drag.overId !== id || drag.edge === undefined || id === drag.fromId)
      return undefined;
    const from = indexOf(drag.fromId);
    return dropIndex(from, indexOf(id), drag.edge) === from ? undefined : drag.edge;
  };

  return {
    /** The drag props of the row `id`. */
    propsFor: (id: string) => ({
      dragging: drag?.fromId === id,
      dropEdge: lineOn(id),
      onDragStartRow: (fromId: string) => setDrag({ fromId }),
      onDragOverRow: dragOver,
      onDropRow: drop,
      onDragEndRow: () => setDrag(null),
    }),
  };
}
