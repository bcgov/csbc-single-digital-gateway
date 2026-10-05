import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { useRef, useState, type CSSProperties } from 'react';
import type { GridJustify, GridRect } from '../default/grid-placement';
import { freeCells, gridPlacement } from '../default/grid-placement';
import { GAP_REM, layoutGap } from '../default/layout-gap';
import { ChildDispatch, type VerticalBodyProps } from '../default/vertical-layout';
import { GridCells } from './grid-cells';
import { ParentGridFullContext } from './grid-full-context';
import { placedElements } from './grid-order';
import { idOf } from './element-order';
import { useInStudio, useStudioEditor } from './studio-editor';
import { STUDIO_INTERACTIVE } from './studio-element';
import { useActiveDrag } from './use-active-drag';
import { cellGridAccepts, MIN_CELL_PX, useCellGrid } from './use-cell-grid';

/** An alignment as a flex box aligns: the frame's content is a flex column (rule 32). */
const FLEX: Readonly<Record<GridJustify, string>> = Object.freeze({
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
});

/** Outranks the spread default Grid (doc 260 rule 8). */
export const studioGridTester = rankWith(2, uiTypeIs('Grid'));

type GridElement = UISchemaElement & { elements?: UISchemaElement[] };

/**
 * A Grid on gridstack (doc 260 rules 8-20): items at their placed cells; with an editor they move, resize and take drops
 * by cell, and every free cell shows a drop target while a drag this Grid would take is in progress.
 */
export function StudioGrid({
  grid,
  ...dispatch
}: Omit<VerticalBodyProps, 'elements' | 'gap'> & { grid: GridElement }) {
  const editor = useStudioEditor();
  const inStudio = useInStudio();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const layoutId = idOf(grid);
  const elements = grid.elements ?? [];
  const placement = gridPlacement(grid);
  const gap = layoutGap(grid.options);
  const editable = editor !== null && layoutId !== undefined;
  // The measured row height outlives each per-layout grid, so the next one starts laid out (doc 236 rule 30b).
  const cellHeight = useRef(MIN_CELL_PX);
  // Rule 17c: where this Grid's own items are while one is dragged or resized.
  const [live, setLive] = useState<ReadonlyMap<string, GridRect> | null>(null);
  const hasFreeCell = freeCells(placement).length > 0;
  const accepts = cellGridAccepts(
    editable,
    el,
    editor?.move !== undefined,
    editor?.governance === undefined || layoutId === undefined
      ? undefined
      : (source) => editor.governance?.mayDrop(layoutId, source) ?? true,
    hasFreeCell,
  );
  useCellGrid(el, {
    columns: placement.columns,
    rows: placement.effectiveRows,
    gapRem: GAP_REM[gap],
    editable,
    cellHeight: cellHeight.current,
    onCellHeight: (px) => {
      cellHeight.current = px;
    },
    onLayout: (rects) => {
      // Only this Grid's own items: an arrival or departure is a move, written once by the target (doc 243 rule 9).
      if (editor === null || layoutId === undefined || !sameKeys([...rects.keys()], placement))
        return;
      const next = placedElements(grid, rects);
      if (next !== grid.elements) editor.update(layoutId, { elements: [...next] });
    },
    onLive: setLive,
    onDropItem: (drop, itemId) => {
      if (editor !== null && layoutId !== undefined) editor.insert(layoutId, 0, itemId, drop);
    },
    onMoveItem: (drop, elementId) => {
      if (editor?.move === undefined || layoutId === undefined) return;
      editor.move(elementId, layoutId, 0, drop);
      editor.select(elementId);
    },
    accepts,
  });
  const active = useActiveDrag();
  const dragged =
    active !== null && el?.contains(active) === true ? active.getAttribute('gs-id') : null;
  const showing =
    editable && active !== null && (dragged !== null || (accepts !== false && accepts(active)));
  const empty = elements.length === 0;
  const signature = `${placement.columns}x${placement.effectiveRows}|${placement.items
    .map(({ key, x, y, w, h }) => `${key}@${x},${y},${w},${h}`)
    .join('|')}`;
  return (
    <div
      // A new layout is a new grid (doc 236 rule 30): see useCellGrid.
      key={signature}
      ref={setEl}
      data-slot="studio-grid"
      data-gap={gap}
      data-columns={placement.columns}
      data-rows={placement.effectiveRows}
      data-empty={empty ? '' : undefined}
      className={`grid-stack ${editor === null ? '' : STUDIO_INTERACTIVE}`}
    >
      <GridCells
        placement={placement}
        showing={showing}
        outlined={inStudio}
        dragged={dragged}
        live={live}
      />
      {empty && (
        <p
          data-slot="studio-layout-empty"
          className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-placeholder"
        >
          {inStudio ? 'Drag items here' : 'No fields yet'}
        </p>
      )}
      <ParentGridFullContext.Provider value={!hasFreeCell}>
        {placement.items.map((item) => {
          const child = elements[item.index];
          const locked = editor?.governance?.canDrag(item.key) === false;
          return child === undefined ? null : (
            <div
              key={item.key}
              className="grid-stack-item"
              gs-id={item.key}
              gs-x={String(item.x)}
              gs-y={String(item.y)}
              gs-w={String(item.w)}
              gs-h={String(item.h)}
              // Where the content sits inside the cell-filling frame (doc 260 rule 32; styles.css).
              style={
                {
                  '--grid-align-y': FLEX[item.align],
                  '--grid-align-x': FLEX[item.justify],
                } as CSSProperties
              }
              // Doc 259 rule 11: an element the template fixes in place neither moves nor resizes — nor is it moved
              // out of another's way (doc 260 rule 10).
              {...(locked && { 'gs-no-move': 'true', 'gs-no-resize': 'true', 'gs-locked': 'true' })}
            >
              <div className="grid-stack-item-content">
                <ChildDispatch child={child} {...dispatch} />
              </div>
            </div>
          );
        })}
      </ParentGridFullContext.Provider>
    </div>
  );
}

export function StudioGridRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  return (
    <StudioGrid
      grid={uischema as GridElement}
      schema={props.schema}
      path={props.path}
      enabled={props.enabled}
      renderers={props.renderers}
      cells={props.cells}
    />
  );
}

export const studioGridEntry = {
  tester: studioGridTester,
  renderer: withJsonFormsLayoutProps(StudioGridRenderer),
};

/** Whether gridstack's node ids are exactly the Grid's rendered keys — nothing left it, nothing arrived. */
function sameKeys(ids: readonly string[], placement: ReturnType<typeof gridPlacement>): boolean {
  if (ids.length !== placement.items.length) return false;
  const rendered = new Set(placement.items.map((item) => item.key));
  return ids.every((id) => rendered.has(id));
}
