import type { UISchemaElement } from '@jsonforms/core';
import { useContext, useRef } from 'react';
import { GridContext } from '../gridstack/grid-context';
import { GridElementDispatch, type GridElementDispatchProps } from '../gridstack/index';
import { StudioContent } from './studio-content';
import { StudioElementToolbar } from './studio-element-toolbar';
import { StudioItemContext } from './studio-item-context';
import { resizingFor, useItemPermissions, useResizeHandles } from './studio-item-resize';
import { useSelectionPort } from './studio-selection';
import { grantsNothing, useCapability } from './studio-capabilities';

/** A stand-in so the capability hook runs unconditionally even before the element resolves. */
const EMPTY_ELEMENT = { type: 'Element' } as UISchemaElement;

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
  // Doc 221: what a GOVERNING template permits for this element. Ungoverned resolves to
  // FULLY_GRANTED, so `locked` is false and every affordance below renders exactly as before.
  const capability = useCapability(element ?? EMPTY_ELEMENT);
  const locked = grantsNothing(capability);
  // Doc 221: gridstack decides drag/resize from the NODE, so the capability is written onto it.
  // Resizing is the container's call — it rearranges what is around the item — while moving is the
  // element's own.
  // Doc 221: a copy lands BESIDE this element, so it is the parent that must accept a child.
  const canCopy = id === undefined ? false : (selection?.mayCopy?.(id) ?? true);
  useItemPermissions(rootRef, {
    canMove: capability.move,
    canResize: capability.reorderChildren,
  });

  return (
    <div
      ref={rootRef}
      data-slot="studio-grid-item"
      data-element-type={type}
      data-element-id={selection ? id : undefined}
      data-hovered={hovered ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-locked={locked ? '' : undefined}
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
          /**
           * Doc 221 rules 5-6: the popover opens only when it would hold SOMETHING. A locked element
           * offers nothing by definition, and a governed one can have both its actions denied
           * separately — Copy by its parent's `addChildren`, Delete by its own `remove`. Either way
           * an empty popover is still chrome, and "a denied affordance is absent" has to mean the
           * box goes too, not just the buttons inside it.
           */
          open={
            (hovered || selected) &&
            !selection.gesturing &&
            !locked &&
            (canCopy || capability.remove)
          }
          itemRef={rootRef}
          selection={selection}
          canDelete={capability.remove}
          canCopy={canCopy}
        />
      ) : null}
    </div>
  );
}
