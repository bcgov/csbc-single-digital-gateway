import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import * as ui from '../src/renderers-ui';

// Doc 180 rules 14 + 15b — @repo/forms/renderers/default (ui + static Grid).

const schema: JsonSchema = { type: 'object', properties: {} };
const testerContext = { rootSchema: schema, config: {} };
const CATEGORIES = ['cells', 'controlRenderers', 'displayRenderers', 'layoutRenderers'] as const;

const allRenderers = () => [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];

const matching = (type: string) =>
  allRenderers().filter((entry) => entry.tester({ type }, schema, testerContext) > 0);

describe('renderers/default', () => {
  it('exports cells, controlRenderers, displayRenderers and layoutRenderers arrays', () => {
    for (const category of CATEGORIES) {
      expect(Array.isArray(defaults[category]), category).toBe(true);
    }
    expect(Object.keys(defaults).toSorted()).toEqual([...CATEGORIES]);
  });

  it("spreads ui's entries first in each category, preserving entry identity", () => {
    for (const category of CATEGORIES) {
      const source: readonly object[] = ui[category];
      const target: readonly object[] = defaults[category];
      expect(target.length, category).toBeGreaterThanOrEqual(source.length);
      source.forEach((entry, index) => expect(target[index], category).toBe(entry));
    }
    expect(defaults.displayRenderers[0]).toBe(ui.displayRenderers[0]);
  });

  it('holds exactly one entry matching Grid and exactly one matching Heading', () => {
    expect(matching('Grid')).toHaveLength(1);
    expect(matching('Heading')).toHaveLength(1);
    // Grid, VerticalLayout, HorizontalLayout (rule 23) and Form (doc 192 rule 2).
    expect(defaults.layoutRenderers).toHaveLength(4);
  });

  it('renders its Grid as static (grid-stack-static)', async () => {
    const { container } = render(
      createElement(JsonForms, {
        schema,
        uischema: {
          type: 'Grid',
          elements: [{ type: 'Heading', text: 'Static' }],
        } as UISchemaElement,
        data: {},
        renderers: allRenderers(),
        cells: defaults.cells,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Static' })).toBeInTheDocument();
    expect(container.querySelector('.grid-stack')).toHaveClass('grid-stack-static');
  });

  it('does not re-export createGridRenderers', () => {
    expect(defaults).not.toHaveProperty('createGridRenderers');
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/renderers/default/index.ts'),
      'utf8',
    );
    // Anchored to real export statements — prose in comments may name the factory.
    expect(source).not.toMatch(/^export\b[^;]*\bcreateGridRenderers\b/m);
  });
});
