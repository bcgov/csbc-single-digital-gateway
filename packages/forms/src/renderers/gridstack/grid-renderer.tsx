import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import type { GridItemHTMLElement } from 'gridstack';
import { GridStack, type ComponentMap, type GridStackHandle } from 'gridstack/dist/react';
import { useCallback, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { GridStackLayoutOptions } from '../../types/elements';
import { GridContext, type GridContextValue } from './grid-context';
import { DRAG_IN_ATTRIBUTE, dropSourceOf } from './grid-drag-in';
import { dropTargetFor, retargetDropTarget } from './grid-drop-target';
import { useGridEditor } from './grid-editor';
import { useGridGestures } from './grid-gestures';
import { useGridDividers } from './grid-dividers';
import { dividersOf, rowHasRoom, type GridLayoutKind } from './grid-layouts';
import { LayoutNestingContext } from './layout-nesting';
import { buildGridStackOptions, gridElementId, resolveSizeToContent } from './grid-options';

/**
 * Detaches a grid from the grid item it was mounted inside (doc 180 rule 12b).
 *
 * gridstack links any grid initialised under a `.grid-stack-item` as that item's native sub-grid.
 * React unmounts the OUTER grid first, whose destroy() deletes its `opts`; the inner grid's destroy()
 * then reads `parentGridNode.grid.opts` and throws. A nested JSONForms Grid is React-managed, not a
 * `subGridOpts` sub-grid, so it is made a plain top-level grid. gridstack.css styles neither class.
 */
function unlinkFromParentGrid(handle: GridStackHandle | null) {
  const grid = handle?.getGrid();
  const parent = grid?.parentGridNode;
  if (!grid || !parent) return;

  delete parent.subGrid;
  delete grid.parentGridNode;
  grid.el.classList.remove('grid-stack-nested');
  parent.el?.classList.remove('grid-stack-sub-grid');
}

/**
 * A `Grid` layout renderer bound to one components map and one set of factory `gridOptions`.
 *
 * `components` must keep a stable identity (the factory builds it once) — GridStack re-renders its
 * items whenever the map changes. When the options change (new `elements`, new placements), the
 * React wrapper calls gridstack's `updateOptions`, whose `load(children)` updates, adds and removes
 * items in place (doc 183 rule 16).
 *
 * Under a `GridEditorProvider` (doc 183) the Grid is editable: items are keyed by the editor's element
 * ids, foreign grid items may be dropped in, and finished gestures are reported to the editor.
 *
 * `layout` picks what the renderer draws (doc 180 rules 23-28): a free `Grid`, or a `VerticalLayout` /
 * `HorizontalLayout` whose items are placed by element order on a fixed axis. Everything else is shared.
 */
export function createGridLayoutRenderer(
  components: ComponentMap,
  gridOptions: GridStackLayoutOptions | undefined,
  className: string | undefined,
  layout: GridLayoutKind,
) {
  // Resolved once per factory call; GridStack itself always gets sizeToContent: false (rule 8).
  const sizeToContent = resolveSizeToContent(gridOptions);

  function GridLayoutRenderer({
    uischema,
    schema,
    path,
    enabled,
    visible,
    renderers,
    cells,
  }: LayoutProps) {
    const editor = useGridEditor();
    // useId() output contains characters gridstack may place in selectors; keep ids plain.
    const idPrefix = `grid${useId().replace(/[^\w-]/g, '')}`;
    const elements = 'elements' in uischema ? uischema.elements : [];
    const gridHandle = useRef<GridStackHandle>(null);

    // Doc 180 rule 30 (bug B3): a full HorizontalLayout refuses drops. Read through a ref so the
    // callback keeps its identity — a new one would change the options and reload the grid.
    const hasRoom = useRef(true);
    hasRoom.current = layout !== 'horizontal' || rowHasRoom(uischema.options, elements);

    // Doc 194 rule 10: the editor may refuse what this kind of layout cannot hold (a Separator in a row). Read through
    // a ref for the same reason as `hasRoom`.
    const editorRef = useRef(editor);
    editorRef.current = editor;

    // Doc 216 rule 12: `accepts` needs this layout's element id to walk its ancestors. Read through a ref for the
    // same reason as `hasRoom` and `editorRef` — a new `acceptWidgets` would change the options and reload the grid.
    const idRef = useRef<string>('');
    idRef.current = editor ? editor.idOf(uischema) : '';

    // Doc 183 rule 14: grid items, never one that contains this grid (a Grid into itself); doc 189 rule 13: and
    // drag-in sources.
    const acceptWidgets = useCallback((el: Element) => {
      if (!hasRoom.current) return false;
      const isItem = el.matches('.grid-stack-item');
      const candidate = isItem
        ? !el.contains(gridHandle.current?.getGrid()?.el ?? null)
        : el.hasAttribute(DRAG_IN_ATTRIBUTE);
      if (!candidate) return false;
      const source = dropSourceOf(el as GridItemHTMLElement, isItem);
      return (
        source === undefined ||
        (editorRef.current?.accepts?.(layout, source, idRef.current) ?? true)
      );
    }, []);
    const idOf = useMemo(
      () => (editor ? (element: UISchemaElement) => editor.idOf(element) : undefined),
      [editor],
    );

    const options = useMemo(() => {
      // Doc 183 rule 16b: rebuilt options reload the mounted grid, so keep each item's current height.
      const nodes = gridHandle.current?.getGrid()?.engine.nodes ?? [];
      const currentHeights = new Map<string, number>();
      for (const node of nodes) {
        if (node.id !== undefined && node.h !== undefined)
          currentHeights.set(String(node.id), node.h);
      }
      return buildGridStackOptions({
        elements,
        elementOptions: uischema.options,
        gridOptions,
        idPrefix,
        currentHeights,
        layout,
        ...(idOf ? { idOf, acceptWidgets } : {}),
      });
    }, [elements, uischema.options, idPrefix, idOf, acceptWidgets]);

    const context = useMemo<GridContextValue>(
      () => ({
        layout,
        elementsById: new Map(
          elements.map((element, index) => [
            gridElementId(element, index, idPrefix, idOf),
            element,
          ]),
        ),
        schema,
        path,
        enabled,
        renderers,
        cells,
        sizeToContent,
      }),
      [elements, idPrefix, idOf, schema, path, enabled, renderers, cells],
    );

    // Child layout effects run first, so GridStack has initialised by the time this runs. Re-run on
    // `visible`: hiding unmounts the GridStack and showing mounts (and links) a fresh one.
    useLayoutEffect(() => {
      unlinkFromParentGrid(gridHandle.current);
    }, [visible]);
    // Doc 190 rules 1-2: gridstack listens for drops on the enclosing grid item, which leaves the outer grid no
    // pointer space between adjacent nested grids. Re-run after every options update (gridstack may have rebuilt
    // the droppable) and on `visible` (a fresh GridStack).
    // Doc 201 rule 21: a root Form's grid listens on the drop zone around its title as well.
    useLayoutEffect(() => {
      const grid = gridHandle.current?.getGrid();
      retargetDropTarget(grid, dropTargetFor(grid?.el, uischema.type));
    }, [options, visible, uischema.type]);
    // Doc 183 rule 16c (doc 189 bug B4): gridstack 13.2.0's updateOptions reloads `children` only when non-empty, so a
    // Grid whose last element was removed would keep that widget as an undeletable empty item. The wrapper's
    // updateOptions (a child layout effect) has run by now; remove whatever gridstack still holds.
    useLayoutEffect(() => {
      const grid = gridHandle.current?.getGrid();
      if (grid && elements.length === 0 && grid.engine.nodes.length > 0) grid.removeAll(true);
    }, [elements]);
    useGridGestures(gridHandle, editor, uischema, visible);
    useGridDividers(gridHandle, layout === 'horizontal' && dividersOf(uischema.options), visible);

    if (!visible) return null;

    // Doc 194 rule 6: children see this layout's kind — a Form shows its nested error, a Separator in a row hides.
    return (
      <LayoutNestingContext.Provider value={layout}>
        <GridContext.Provider value={context}>
          <GridStack
            ref={gridHandle}
            options={options}
            components={components}
            {...(className ? { className } : {})}
          />
        </GridContext.Provider>
      </LayoutNestingContext.Provider>
    );
  }

  return withJsonFormsLayoutProps(GridLayoutRenderer);
}
