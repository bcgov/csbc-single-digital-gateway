import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import type { GridStackEngine } from 'gridstack';
import { useRef, useState, type CSSProperties } from 'react';
import { isRow, rowElements, rowHasRoom, storedWidths } from '../../studio/row-edits';
import type { GridDrop, GridRect } from '../default/grid-placement';
import { GAP_REM, layoutGap } from '../default/layout-gap';
import { rowPlacement, type RowJustify } from '../default/row-placement';
import { ChildDispatch, type VerticalBodyProps } from '../default/vertical-layout';
import { NO_ROOM_IN_ROW, ParentGridFullContext } from './grid-full-context';
import { GridRowEngine } from './grid-row-engine';
import { idOf } from './element-order';
import { FLEX } from './studio-grid';
import { dropCheck, useInStudio, useStudioEditor } from './studio-editor';
import { STUDIO_INTERACTIVE } from './studio-element';
import { cellGridAccepts, MIN_CELL_PX, useCellGrid } from './use-cell-grid';

/** Outranks the spread default HorizontalLayout (doc 261 rule 7). */
export const studioHorizontalLayoutTester = rankWith(2, uiTypeIs('HorizontalLayout'));

type RowElement = UISchemaElement & { elements?: UISchemaElement[] };

/** Where a drop lands in the row's order: how many of the row's own items sit left of it (doc 261 rule 16). */
function dropIndex(drop: GridDrop): number {
  return [...(drop.displaced?.values() ?? [])].filter((rect) => rect.x < drop.x).length;
}

/** The row's items left to right, and the widths gridstack shows them at (doc 261 rules 14-15). */
function orderOf(rects: ReadonlyMap<string, GridRect>): {
  order: string[];
  shown: Map<string, number>;
} {
  const sorted = [...rects].toSorted(([, a], [, b]) => a.x - b.x);
  return {
    order: sorted.map(([key]) => key),
    shown: new Map(sorted.map(([key, r]) => [key, r.w])),
  };
}

/**
 * A HorizontalLayout on gridstack (doc 261 rules 7-16): one row of packed items at their display spans. With an editor
 * they reorder by drag, resize from their left and right edges, and take drops — the row engine repacks every step.
 */
export function StudioHorizontalLayout({
  row,
  ...dispatch
}: Omit<VerticalBodyProps, 'elements' | 'gap'> & { row: RowElement }) {
  const editor = useStudioEditor();
  const inStudio = useInStudio();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const layoutId = idOf(row);
  const elements = row.elements ?? [];
  const placement = rowPlacement(row);
  const gap = layoutGap(row.options);
  const editable = editor !== null && layoutId !== undefined;
  const cellHeight = useRef(MIN_CELL_PX);
  const record = row as unknown as Record<string, unknown>;
  const hasRoom = isRow(record) && rowHasRoom(record);
  const accepts = cellGridAccepts(
    editable,
    el,
    editor?.move !== undefined,
    dropCheck(editor, layoutId),
    hasRoom,
  );
  useCellGrid(el, {
    columns: placement.columns,
    rows: 1,
    gapRem: GAP_REM[gap],
    editable,
    cellHeight: cellHeight.current,
    onCellHeight: (px) => {
      cellHeight.current = px;
    },
    engineClass: GridRowEngine,
    handles: 'e,w',
    configureEngine: (engine: GridStackEngine) => {
      (engine as GridRowEngine).justify = placement.justify satisfies RowJustify;
    },
    onLayout: (rects) => {
      // Only the row's own items: an arrival or departure is a move, written once by the target (doc 243 rule 9).
      const keys = new Set(placement.items.map((item) => item.key));
      if (editor === null || layoutId === undefined) return;
      if (rects.size !== keys.size || ![...rects.keys()].every((key) => keys.has(key))) return;
      const { order, shown } = orderOf(rects);
      const next = rowElements(record, order, storedWidths(record, shown));
      if (next !== row.elements) editor.update(layoutId, { elements: [...next] });
    },
    onLive: () => {},
    onDropItem: (drop, itemId) => {
      if (editor !== null && layoutId !== undefined)
        editor.insert(layoutId, dropIndex(drop), itemId);
    },
    onMoveItem: (drop, elementId) => {
      if (editor?.move === undefined || layoutId === undefined) return;
      editor.move(elementId, layoutId, dropIndex(drop));
      editor.select(elementId);
    },
    accepts,
  });
  const empty = elements.length === 0;
  const signature = `${placement.columns}|${placement.justify}|${placement.items
    .map(({ key, x, w }) => `${key}@${x},${w}`)
    .join('|')}`;
  return (
    <div
      // A new layout is a new grid (doc 236 rule 30): see useCellGrid.
      key={signature}
      ref={setEl}
      data-slot="studio-row"
      data-gap={gap}
      data-columns={placement.columns}
      data-justify={placement.justify}
      data-empty={empty ? '' : undefined}
      className={`grid-stack ${editor === null ? '' : STUDIO_INTERACTIVE}`}
    >
      {empty && (
        <p
          data-slot="studio-layout-empty"
          className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-placeholder"
        >
          {inStudio ? 'Drag items here' : 'No fields yet'}
        </p>
      )}
      <ParentGridFullContext.Provider value={hasRoom ? null : NO_ROOM_IN_ROW}>
        {placement.items.map((item) => {
          const child = elements[item.index];
          const locked = editor?.governance?.canDrag(item.key) === false;
          return child === undefined ? null : (
            <div
              key={item.key}
              className="grid-stack-item"
              gs-id={item.key}
              gs-x={String(item.x)}
              gs-y="0"
              gs-w={String(item.w)}
              gs-h="1"
              style={
                {
                  '--grid-align-y': FLEX[item.align],
                  '--grid-align-x': FLEX[item.justify],
                } as CSSProperties
              }
              // Doc 259 rule 11: a child the template fixes in place neither moves, resizes nor gives way.
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

export function StudioHorizontalLayoutRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  return (
    <StudioHorizontalLayout
      row={uischema as RowElement}
      schema={props.schema}
      path={props.path}
      enabled={props.enabled}
      renderers={props.renderers}
      cells={props.cells}
    />
  );
}

export const studioHorizontalLayoutEntry = {
  tester: studioHorizontalLayoutTester,
  renderer: withJsonFormsLayoutProps(StudioHorizontalLayoutRenderer),
};
