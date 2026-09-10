import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Doc 180 rule 16c — the studio's resize handle indicators are pure CSS. jsdom evaluates neither
// `:hover` nor layout, so these pin the rules themselves; how they look is verified in the browser.

const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8').replaceAll(
  /\/\*[\s\S]*?\*\//g,
  '',
);

// A selector prelude may carry a preceding at-statement (`@import …;`), so keep what follows the last
// `;`, and split the list only on commas outside `[…]` and `(…)`.
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, prelude = '', body = '']) => ({
  selectors: (prelude.split(';').at(-1) ?? '')
    .split(/,(?![^[(]*[\])])/)
    // Prettier wraps long selectors inside `:has(…)`, leaving `( ` / ` )` once whitespace collapses.
    .map((s) => s.replaceAll(/\s+/g, ' ').replaceAll('( ', '(').replaceAll(' )', ')').trim()),
  body: body.replaceAll(/\s+/g, ' '),
}));

/** The declarations of the rule whose selector list contains exactly `selector`. */
function bodyFor(selector: string): string {
  const rule = rules.find(({ selectors }) => selectors.includes(selector));
  expect(rule, selector).toBeDefined();
  return rule?.body ?? '';
}

const count = (text: string, part: string) => text.split(part).length - 1;
const RING = 'linear-gradient(var(--app-ring) 0 0)';
const handle = (side: string) => `.form-studio-grid > .grid-stack-item > .ui-resizable-${side}`;

describe('studio resize handle indicators (doc 180 rule 16c)', () => {
  it('declares the bracket arm and edge bar lengths once, on the studio grid', () => {
    const body = bodyFor('.form-studio-grid');
    expect(body).toContain('--studio-corner-arm: 1rem');
    expect(body).toContain('--studio-edge-bar: 50px');
  });

  it("replaces gridstack's icons on every studio handle", () => {
    const body = bodyFor('.form-studio-grid > .grid-stack-item > .ui-resizable-handle');
    expect(body).toContain('background-image: none');
    expect(body).toContain('background-repeat: no-repeat');
    expect(body).not.toContain('display');
  });

  it.each([
    ['n', 'center top', 'min(var(--studio-edge-bar), 100%) 2px'],
    ['s', 'center bottom', 'min(var(--studio-edge-bar), 100%) 2px'],
    ['e', 'right center', '2px min(var(--studio-edge-bar), 100%)'],
    ['w', 'left center', '2px min(var(--studio-edge-bar), 100%)'],
  ])('draws a ring-coloured bar on the %s edge handle', (side, position, size) => {
    const body = bodyFor(handle(side));
    expect(count(body, RING)).toBe(1);
    expect(body).toContain(`background-size: ${size}`);
    expect(body).toContain(`background-position: ${position}`);
  });

  it.each([
    ['nw', 'left top'],
    ['ne', 'right top'],
    ['se', 'right bottom'],
    ['sw', 'left bottom'],
  ])('draws an unrotated ring-coloured bracket on the %s corner handle', (corner, position) => {
    const body = bodyFor(handle(corner));
    expect(count(body, RING)).toBe(2);
    expect(body).toContain(
      'background-size: var(--studio-corner-arm) 2px, 2px var(--studio-corner-arm)',
    );
    expect(body).toContain(`background-position: ${position}, ${position}`);
    expect(body).toContain('transform: none');
  });

  it('shows only the corner brackets on an item that has corner handles (its edge bars draw nothing)', () => {
    const body = bodyFor(
      '.form-studio-grid > .grid-stack-item:has(> :is(.ui-resizable-ne, .ui-resizable-nw, .ui-resizable-se, .ui-resizable-sw)) > :is(.ui-resizable-n, .ui-resizable-e, .ui-resizable-s, .ui-resizable-w)',
    );
    expect(body).toContain('background-image: none');
    // Only the indicator goes — the edge handles still resize.
    expect(body).not.toContain('display');
    expect(body).not.toContain('pointer-events');
  });

  it('draws no overlay of its own — only the handles gridstack rendered carry indicators', () => {
    expect(css).not.toContain('::after');
  });

  it('uses emitted --app-* tokens, never the @theme inline --color-* ones', () => {
    expect(css).not.toContain('--color-');
  });
});
