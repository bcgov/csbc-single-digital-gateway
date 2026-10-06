import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// jsdom evaluates no cursor or overflow, so the stylesheet's studio rules are pinned by their text.
// Prettier rewrites attribute quotes to single quotes (CLAUDE.md, feature 193).
const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
/** The stylesheet with whitespace collapsed — Prettier wraps a long selector across lines wherever it likes. */
const flat = css.replace(/\s+/g, ' ');
/** The selector every Grid and row rule starts with (doc 260 rule 14, doc 261 rule 7). */
const CELLS = ".grid-stack:is([data-slot='studio-grid'], [data-slot='studio-row'])";
const grid = ".grid-stack[data-slot='studio-vertical-layout']";

describe('@repo/documents styles.css (doc 236)', () => {
  it('imports gridstack before the xyflow styles', () => {
    expect(css).toContain("@import 'gridstack/dist/gridstack.css';");
    expect(css.indexOf('gridstack.css')).toBeLessThan(css.indexOf('@xyflow/react/dist/style.css'));
  });

  it('shows the default cursor over a studio grid and everything in it while an item is dragged', () => {
    expect(css).toContain(
      `${grid}.grid-stack-dragging,\n${grid}.grid-stack-dragging * {\n  cursor: default;\n}`,
    );
    // Unlayered: a layered rule would lose to the Heading's `cursor-text` utility.
    expect(css).not.toMatch(/@layer[^{]*\{[^}]*grid-stack-dragging/);
  });

  it('lets studio item content overflow, so a selection outline is never clipped', () => {
    expect(css).toContain(
      `${grid} > .grid-stack-item > .grid-stack-item-content {\n  overflow: visible;\n}`,
    );
  });

  it("pulls only a Form's ROOT layout out by its gridstack margins (rule 27b)", () => {
    expect(css).toContain(
      `[data-slot='form'] > ${grid} {\n  margin: calc(-1 * var(--gs-item-margin-top)) calc(-1 * var(--gs-item-margin-right))\n    calc(-1 * var(--gs-item-margin-bottom)) calc(-1 * var(--gs-item-margin-left));\n}`,
    );
  });

  it('never pulls a nested layout outwards — its edges would draw outside its selection ring', () => {
    expect(css).not.toMatch(/^\.grid-stack\[data-slot='studio-vertical-layout'\] \{/m);
  });

  it("translates a dragged item's content back by the grab distance, both axes (doc 243 rule 12b, doc 260 rule 12)", () => {
    expect(css).toContain(
      `${grid}\n  > .grid-stack-item.ui-draggable-dragging\n  > .grid-stack-item-content {\n  translate: var(--gs-grab-offset-x, 0px) var(--gs-grab-offset, 0px);\n}`,
    );
    expect(flat).toContain(
      `${CELLS} > .grid-stack-item.ui-draggable-dragging > .grid-stack-item-content { translate: var(--gs-grab-offset-x, 0px) var(--gs-grab-offset, 0px); }`,
    );
  });

  it('lets nothing inside a dragged item take the pointer, beating pointer-events-auto (doc 243 bug B1)', () => {
    expect(css).toContain(
      '.grid-stack-item.ui-draggable-dragging,\n.grid-stack-item.ui-draggable-dragging * {\n  pointer-events: none !important;\n}',
    );
    expect(css).not.toMatch(/@layer[^{]*\{[^}]*ui-draggable-dragging/);
  });

  // Bug (doc 236 B3, found by hand): gridstack's `.grid-stack-animate .grid-stack-item` is a DESCENDANT selector, so an
  // animating root grid transitioned a remounted NESTED grid's brand-new items from `top: 0` — they slid down from the
  // top of their layout on every insert.
  it("animates only a grid's OWN items, never a nested grid's", () => {
    expect(css).toContain(`${grid} .grid-stack-item {\n  transition: none;\n}`);
    expect(css).toContain(
      ".grid-stack-animate[data-slot='studio-vertical-layout'] > .grid-stack-item {\n  transition:",
    );
    expect(css).toContain(
      ".grid-stack-animate[data-slot='studio-vertical-layout'] > .grid-stack-item.ui-draggable-dragging,",
    );
  });
  it("draws a Grid child's corner handles as brackets that never take the pointer (doc 260 rule 10b)", () => {
    expect(flat).toContain(`${CELLS} > .grid-stack-item > .ui-resizable-handle::after {`);
    expect(css).toMatch(/ui-resizable-handle::after \{[^}]*pointer-events: none;[^}]*\}/);
    for (const corner of ['nw', 'ne', 'se', 'sw'])
      expect(flat).toContain(`${CELLS} > .grid-stack-item > .ui-resizable-${corner}::after {`);
    expect(flat).toContain(`${CELLS} > .grid-stack-item:hover > .ui-resizable-handle::after,`);
  });

  it("starts every Grid handle AT the element's frame, 4px out, and never beyond it (rule 10b)", () => {
    const handles = [...css.matchAll(/> \.ui-resizable-(?:n|e|s|w|ne|nw|se|sw) \{[^}]*\}/g)].map(
      (m) => m[0],
    );
    expect(handles.length).toBeGreaterThan(0);
    // Outward offsets are exactly the frame's 4px; nothing reaches further into the gap around the child.
    for (const rule of handles) {
      for (const [, offset] of rule.matchAll(/- (\d+)px\)/g)) expect(offset).toBe('4');
    }
    expect(flat).toContain(
      `${CELLS} > .grid-stack-item > .ui-resizable-nw { top: calc(var(--gs-item-margin-top) - 4px);`,
    );
  });
  it("stretches a Grid child's frame to its cell with min-height, so content can still grow the row (doc 260 rule 9b)", () => {
    expect(css).toMatch(/\[data-slot='studio-element'\] \{\n  min-height: 100%;/);
    // Rule 32: its content aligned inside it, by the item's resolved alignment.
    expect(css).toContain('justify-content: var(--grid-align-y, flex-start);');
    expect(css).toContain('align-items: var(--grid-align-x, stretch);');
  });
  it("grows a Grid's placeholder to an element's frame, 4px outside its content box (doc 260 rule 17d)", () => {
    expect(css).toContain('top: calc(var(--gs-item-margin-top) - 4px);');
    expect(flat).toContain(`${CELLS} > .grid-stack-placeholder > .placeholder-content {`);
  });
  it("lets a Grid child's edges resize without drawing them — only its corners show brackets (doc 260 rule 10b)", () => {
    for (const edge of ['n', 'e', 's', 'w'])
      expect(flat).toContain(`${CELLS} > .grid-stack-item > .ui-resizable-${edge}`);
    // The only borders drawn are the corners'.
    expect(css).not.toMatch(/ui-resizable-[nesw] \{[^}]*border/);
  });

  it('keeps a dragged item visible when the tab it lives in is hidden (doc 272 rule 6e)', () => {
    expect(flat).toContain('.grid-stack-item.ui-draggable-dragging { visibility: visible; }');
  });

  it("gives every tab's grid a floor height so it stays easy to drop into (doc 272 rule 6f)", () => {
    expect(flat).toContain(
      "[data-slot='studio-tabs'] [role='tabpanel'] > [data-slot='studio-element'] > [data-slot='studio-vertical-layout'] { min-height: 8rem; }",
    );
  });

  it("gives a card slot's grid a floor height, so it never collapses when its only item is dragged out (doc 273 B1)", () => {
    expect(flat).toContain(
      "[data-slot='card-slot'] > [data-slot='studio-element'] > [data-slot='studio-vertical-layout'] { min-height: 4rem; }",
    );
  });
});
