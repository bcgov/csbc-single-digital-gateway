import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// jsdom evaluates no cursor or overflow, so the stylesheet's studio rules are pinned by their text.
// Prettier rewrites attribute quotes to single quotes (CLAUDE.md, feature 193).
const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
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

  it('pulls a studio layout out by its gridstack margins, so it has no outer padding (rule 27b)', () => {
    expect(css).toContain(
      `${grid} {\n  margin: calc(-1 * var(--gs-item-margin-top)) calc(-1 * var(--gs-item-margin-right))\n    calc(-1 * var(--gs-item-margin-bottom)) calc(-1 * var(--gs-item-margin-left));\n}`,
    );
  });
});
