import { useContext, useRef } from 'react';
import { GridContext } from '../gridstack/grid-context';
import { GridElementDispatch, type GridElementDispatchProps } from '../gridstack/index';
import { StudioContent } from './studio-content';
import { StudioElementToolbar } from './studio-element-toolbar';
import { StudioItemContext } from './studio-item-context';
import { resizingFor, useResizeHandles } from './studio-item-resize';
import { useSelectionPort } from './studio-selection';

/**
 * The studio's grid item (doc 180 rules 17b, 17d), registered under `GRID_ELEMENT_COMPONENT`.
 *
 * Its root is the item content's single child — the element gridstack measures for size-to-content —
 * so its padding counts towards the item's height instead of being clipped. The element type is
 * carried as `data-element-type` only, never shown (rule 16b). The border itself is drawn on the item
 * box by `STUDIO_GRID_CLASS`, and the resize handle indicators by the stylesheet (rule 16c). The child is
 * dispatched disabled and held
 * inert (`StudioContent`), and `StudioItemContext` stops the framed renderer drawing a second frame.
 * The element type picks the item's resize handles and sizing in a Grid: a Control only resizes sideways
 * and fits its content; anything else may also be made taller, with its content as the minimum. In a
 * HorizontalLayout every item resizes sideways only, in a VerticalLayout none do (rule 30). The element
 * is found by `elementId`, never by index (doc 183 rule 7).
 *
 * Under the Form Studio's selection port (doc 185) the root carries `data-element-id` plus
 * `data-hovered` / `data-selected`, which recolour the item border, and the item renders its actions
 * popover. The popover portals out, so it adds nothing to the measured content.
 */
export function StudioGridElement({ elementId }: GridElementDispatchProps) {
  const grid = useContext(GridContext);
  const selection = useSelectionPort();
  const rootRef = useRef<HTMLDivElement>(null);
  const id = typeof elementId === 'string' ? elementId : undefined;
  const element = id === undefined ? undefined : grid?.elementsById.get(id);
  const type = element?.type ?? 'Element';
  const { handles, sizing } = resizingFor(type, grid?.layout ?? 'grid');
  useResizeHandles(rootRef, handles);

  const hovered = id !== undefined && selection?.hoveredId === id;
  const selected = id !== undefined && selection?.selectedId === id;

  return (
    <div
      ref={rootRef}
      data-slot="studio-grid-item"
      data-element-type={type}
      data-element-id={selection ? id : undefined}
      data-hovered={hovered ? '' : undefined}
      data-selected={selected ? '' : undefined}
      className="p-2"
    >
      <StudioItemContext.Provider value>
        <StudioContent type={type}>
          <GridElementDispatch elementId={elementId} enabled={false} sizing={sizing} />
        </StudioContent>
      </StudioItemContext.Provider>
      {selection && id !== undefined ? (
        <StudioElementToolbar
          elementId={id}
          open={(hovered || selected) && !selection.gesturing}
          itemRef={rootRef}
          selection={selection}
        />
      ) : null}
    </div>
  );
}
