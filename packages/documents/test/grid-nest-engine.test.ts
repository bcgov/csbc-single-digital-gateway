import { GridStackEngine, type GridStackMoveOpts, type GridStackNode } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { cursorRect, GridNestEngine } from '../src/renderers/studio/grid-nest-engine';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

// Doc 243 rule 12b / bug B1: gridstack displaced neighbours by the dragged item's EDGES, so a TALL item grabbed in its
// middle swapped a nested layout out from under the cursor before the cursor reached its grid. jsdom can't drag, so
// these drive the engine's collision check with the rects gridstack caches at drag start (cell 4px, no margins). With
// the grab offset clamp, the drag rect's top edge is the cursor.

type Coverage = (
  n: GridStackNode,
  o: GridStackMoveOpts,
  c: GridStackNode[],
) => GridStackNode | undefined;

/**
 * A one-column page — a tall field (rows 0-20, 0-80px), a short nested layout (rows 20-30, 80-120px), a field (rows
 * 30-35, 120-140px) — added as a real grid adds them, with the drag started on the node with id `dragging`.
 */
function page(Engine: typeof GridStackEngine, dragging = 'tall') {
  const engine = new Engine({ column: 1, float: false });
  const nodes = [
    engine.addNode({ id: 'tall', x: 0, y: 0, w: 1, h: 20 }),
    engine.addNode({ id: 'layout', x: 0, y: 20, w: 1, h: 10 }),
    engine.addNode({ id: 'field', x: 0, y: 30, w: 1, h: 5 }),
  ];
  // gridstack caches every node's rect at drag start; `cacheRects` is @internal, so absent from its types.
  (engine as unknown as { cacheRects: (...size: number[]) => void }).cacheRects(100, 4, 0, 0, 0, 0);
  const dragged = nodes.find((n) => n.id === dragging)!;
  Object.assign(dragged, { _moving: true });
  const others = nodes.filter((n) => n !== dragged);
  /** What the dragged item collides with when the drag rect's top (the cursor) is at `cursorY` grid pixels. */
  const collideAt = (cursorY: number) =>
    (engine as unknown as { directionCollideCoverage: Coverage }).directionCollideCoverage(
      dragged,
      { x: 0, y: Math.round(cursorY / 4), rect: { x: 0, y: cursorY, w: 100, h: dragged.h! * 4 } },
      others,
    )?.id;
  return { collideAt };
}

describe('cursorRect (doc 243 rule 12b)', () => {
  it("keeps the rect's top — the cursor — and cuts it to one pixel", () => {
    expect(cursorRect({ x: 3, y: 24, w: 100, h: 80 })).toEqual({ x: 3, y: 24, w: 100, h: 1 });
  });
});

describe('GridNestEngine coverage from the cursor (doc 243 rule 12b, bug B1)', () => {
  it("reproduces the bug with gridstack's own engine: the tall item's bottom edge displaces the layout", () => {
    // Cursor at 24px, still on the tall field — but its bottom edge (104px) covers 60% of the layout.
    expect(page(GridStackEngine).collideAt(24)).toBe('layout');
  });

  it('leaves the layout alone while the cursor is above it', () => {
    expect(page(GridNestEngine).collideAt(24)).toBeUndefined();
  });

  it('never reaches past the layout to a field beyond it — which would pull the layout up past the cursor', () => {
    // The tall item's rect (60-140px) covers the field beyond the layout entirely.
    expect(page(GridStackEngine).collideAt(60)).toBeDefined();
    expect(page(GridNestEngine).collideAt(60)).toBeUndefined();
  });

  it('leaves the layout alone while the cursor is in its first half — its own grid takes the drag there', () => {
    expect(page(GridNestEngine).collideAt(90)).toBeUndefined();
  });

  it('displaces a neighbour once the cursor crosses its midpoint, from above and from below', () => {
    expect(page(GridNestEngine).collideAt(104)).toBe('layout');
    // The field (120-140px) dragged up: past the layout's midpoint (100px) from below.
    expect(page(GridNestEngine, 'field').collideAt(110)).toBeUndefined();
    expect(page(GridNestEngine, 'field').collideAt(96)).toBe('layout');
  });

  it('runs every studio grid', () => {
    const { container } = renderStudioRenderers({
      id: 'form',
      type: 'Form',
      elements: [{ id: 'inner', type: 'VerticalLayout', elements: [studioHeading('a', 'A')] }],
    });
    const grids = [
      ...container.querySelectorAll('[data-slot="studio-vertical-layout"]'),
    ] as (HTMLElement & {
      gridstack: { engine: GridStackEngine };
    })[];
    expect(grids).toHaveLength(2);
    for (const grid of grids) expect(grid.gridstack.engine).toBeInstanceOf(GridNestEngine);
  });
});
