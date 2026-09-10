import type { LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { GridStack, type ComponentMap, type GridStackHandle } from 'gridstack/dist/react';
import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { GridStackLayoutOptions } from '../../types/elements';
import { GridContext, type GridContextValue } from './grid-context';
import { buildGridStackOptions, resolveSizeToContent } from './grid-options';

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
 * items whenever the map changes. GridStack reads `children` only at mount, so later changes to
 * `elements` are not reflected (doc 180 known issue).
 */
export function createGridLayoutRenderer(
  components: ComponentMap,
  gridOptions: GridStackLayoutOptions | undefined,
  className: string | undefined,
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
    // useId() output contains characters gridstack may place in selectors; keep ids plain.
    const idPrefix = `grid${useId().replace(/[^\w-]/g, '')}`;
    const elements = 'elements' in uischema ? uischema.elements : [];

    const options = useMemo(
      () =>
        buildGridStackOptions({
          elements,
          elementOptions: uischema.options,
          gridOptions,
          idPrefix,
        }),
      [elements, uischema.options, idPrefix],
    );

    const context = useMemo<GridContextValue>(
      () => ({ elements, schema, path, enabled, renderers, cells, sizeToContent }),
      [elements, schema, path, enabled, renderers, cells],
    );

    // Child layout effects run first, so GridStack has initialised by the time this runs. Re-run on
    // `visible`: hiding unmounts the GridStack and showing mounts (and links) a fresh one.
    const gridHandle = useRef<GridStackHandle>(null);
    useLayoutEffect(() => {
      unlinkFromParentGrid(gridHandle.current);
    }, [visible]);

    if (!visible) return null;

    return (
      <GridContext.Provider value={context}>
        <GridStack
          ref={gridHandle}
          options={options}
          components={components}
          {...(className ? { className } : {})}
        />
      </GridContext.Provider>
    );
  }

  return withJsonFormsLayoutProps(GridLayoutRenderer);
}
