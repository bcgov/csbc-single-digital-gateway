import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { createContext, useContext, useRef, useState } from 'react';
import { GAP_REM, layoutGap } from '../default/layout-gap';
import { ChildDispatch, elementKey, type VerticalBodyProps } from '../default/vertical-layout';
import { idOf, reorderElements } from './element-order';
import { dropCheck, useInStudio, useStudioEditor } from './studio-editor';
import { STUDIO_INTERACTIVE } from './studio-element';
import { ParentGridFullContext } from './grid-full-context';
import { useVerticalGrid } from './use-vertical-grid';

/** An empty grid keeps 12 rows (48px) so it can still take a drop (doc 238 rule 17). */
const EMPTY_ROWS = 12;
/** An empty ROOT grid's frame; a nested layout's wrapper already frames it (doc 238 rule 17). */
const EMPTY_FRAME = 'rounded-md border border-dashed border-border';

/**
 * Measured item heights in rows, by element id, SHARED by every grid on a page (doc 243 rule 14): the outermost grid
 * owns the map and its nested grids use it. A moved element arrives in a grid that never measured it, and a per-grid
 * cache drew it one row tall — and its layout too short in the parent — until both grew while gridstack animated.
 */
const GridHeightsContext = createContext<Map<string, number> | null>(null);

/** Outranks the spread default VerticalLayout (doc 236 rule 26). */
export const studioVerticalLayoutTester = rankWith(2, uiTypeIs('VerticalLayout'));

/**
 * A one-column gridstack grid of `elements`; with an editor they drag to reorder, written back as
 * `update(layoutId, { elements })` (doc 236 rules 26-31). Shared by the studio VerticalLayout and Form (rule 40).
 */
export function StudioVerticalGrid({
  layoutId,
  elements,
  gap,
  dropZone,
  framedWhenEmpty = false,
  ...dispatch
}: VerticalBodyProps & {
  /** Draw the empty drop zone's own dashed frame — only a root grid, which no wrapper frames. */
  framedWhenEmpty?: boolean;
  layoutId: string | undefined;
  /** Where to listen for drops, if not the grid itself (doc 238 rule 13b). */
  dropZone?: ((grid: HTMLElement) => HTMLElement | null) | undefined;
}) {
  const editor = useStudioEditor();
  const inStudio = useInStudio();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const keys = elements.map(elementKey);
  // Measured heights outlive each per-order grid, so the next one is rendered already laid out (rule 30b) — and are
  // shared with every grid on the page, so a moved element arrives laid out too (doc 243 rule 14).
  const shared = useContext(GridHeightsContext);
  const own = useRef(new Map<string, number>()).current;
  const heights = shared ?? own;
  const rows = keys.map((key) => heights.get(key) ?? 1);
  const tops = rows.map((_, index) => rows.slice(0, index).reduce((sum, h) => sum + h, 0));
  useVerticalGrid(el, {
    heights,
    gapRem: GAP_REM[gap],
    editable: editor !== null && layoutId !== undefined,
    onReorder: (ordered) => {
      // An item that left or arrived from another grid is a move, written once by the target (doc 243 rule 9).
      if (editor === null || layoutId === undefined || !sameKeys(ordered, keys)) return;
      const next = reorderElements(elements, ordered);
      if (next !== elements) editor.update(layoutId, { elements: next });
    },
    onDropItem: (index, itemId) => {
      if (editor !== null && layoutId !== undefined) editor.insert(layoutId, index, itemId);
    },
    onMoveItem: (index, elementId) => {
      if (editor?.move === undefined || layoutId === undefined) return;
      editor.move(elementId, layoutId, index);
      // The moved element is selected (doc 243 rule 8).
      editor.select(elementId);
    },
    acceptMoves: editor?.move !== undefined,
    mayDrop: dropCheck(editor, layoutId),
    minRow: elements.length === 0 ? EMPTY_ROWS : 0,
    dropZone,
  });
  const empty = elements.length === 0;
  return (
    <div
      // A new order is a new grid (rule 30): see useVerticalGrid.
      key={keys.join('\u0000')}
      ref={setEl}
      data-slot="studio-vertical-layout"
      data-gap={gap}
      data-empty={empty ? '' : undefined}
      className={`grid-stack ${editor === null ? '' : STUDIO_INTERACTIVE} ${empty && framedWhenEmpty ? EMPTY_FRAME : ''}`}
    >
      {empty && (
        // A drop zone, not an item: gridstack only manages `.grid-stack-item` children (doc 238 rule 17).
        <p
          data-slot="studio-layout-empty"
          className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-placeholder"
        >
          {/* Worded by the studio's PRESENCE, not editability: a page opening has no editor yet (doc 238 bug B1). */}
          {inStudio ? 'Drag items here' : 'No fields yet'}
        </p>
      )}
      <GridHeightsContext.Provider value={heights}>
        {/* Its children sit in THIS layout, never an outer Grid (doc 260 rule 22). */}
        <ParentGridFullContext.Provider value={null}>
          {elements.map((child, index) => (
            <div
              key={keys[index]}
              className="grid-stack-item"
              gs-id={keys[index]}
              gs-x="0"
              gs-y={String(tops[index])}
              gs-w="1"
              gs-h={String(rows[index])}
              // Doc 259 rule 11: an element the template fixes in place cannot be dragged.
              {...(editor?.governance?.canDrag(keys[index] ?? '') === false && {
                'gs-no-move': 'true',
              })}
            >
              <div className="grid-stack-item-content">
                <ChildDispatch child={child} {...dispatch} />
              </div>
            </div>
          ))}
        </ParentGridFullContext.Provider>
      </GridHeightsContext.Provider>
    </div>
  );
}

export function StudioVerticalLayoutRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  return (
    <StudioVerticalGrid
      layoutId={idOf(uischema)}
      elements={(uischema as Layout).elements ?? []}
      gap={layoutGap(uischema.options)}
      schema={props.schema}
      path={props.path}
      enabled={props.enabled}
      renderers={props.renderers}
      cells={props.cells}
    />
  );
}

export const studioVerticalLayoutEntry = {
  tester: studioVerticalLayoutTester,
  renderer: withJsonFormsLayoutProps(StudioVerticalLayoutRenderer),
};

/** Whether a grid's node ids are exactly the keys it rendered — nothing left it, nothing arrived. */
function sameKeys(ordered: readonly string[], keys: readonly string[]): boolean {
  if (ordered.length !== keys.length) return false;
  const rendered = new Set(keys);
  return ordered.every((key) => rendered.has(key));
}
