import { useContext, useRef } from 'react';
import { GridContext } from '../gridstack/grid-context';
import { GridElementDispatch, type GridElementDispatchProps } from '../gridstack/index';
import { StudioContent } from './studio-content';
import { StudioItemContext } from './studio-item-context';
import { resizingFor, useResizeHandles } from './studio-item-resize';

/**
 * The studio's grid item (doc 180 rules 17b, 17d), registered under `GRID_ELEMENT_COMPONENT`.
 *
 * Its root is the item content's single child — the element gridstack measures for size-to-content —
 * so its padding counts towards the item's height instead of being clipped. The element type is
 * carried as `data-element-type` only, never shown (rule 16b). The border itself is drawn on the item
 * box by `STUDIO_GRID_CLASS`, and the resize handle indicators by the stylesheet (rule 16c). The child is
 * dispatched disabled and held
 * inert (`StudioContent`), and `StudioItemContext` stops the framed renderer drawing a second frame.
 * The element type picks the item's resize handles and sizing: a Control only resizes sideways and
 * fits its content; anything else may also be made taller, with its content as the minimum. The element
 * is found by `elementId`, never by index (doc 183 rule 7).
 */
export function StudioGridElement({ elementId }: GridElementDispatchProps) {
  const grid = useContext(GridContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const element = typeof elementId === 'string' ? grid?.elementsById.get(elementId) : undefined;
  const type = element?.type ?? 'Element';
  const { handles, sizing } = resizingFor(type);
  useResizeHandles(rootRef, handles);

  return (
    <div ref={rootRef} data-slot="studio-grid-item" data-element-type={type} className="p-2">
      <StudioItemContext.Provider value>
        <StudioContent type={type}>
          <GridElementDispatch elementId={elementId} enabled={false} sizing={sizing} />
        </StudioContent>
      </StudioItemContext.Provider>
    </div>
  );
}
