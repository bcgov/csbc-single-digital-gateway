import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { inspectorErrors } from '../src/studio/inspector/inspector-form';
import { el, formFor, grid, heading, name, qty, row, rowQty } from './inspector-fixtures';

// Doc 187 rules 13-14 — reading the document into the inspector's view model, and cross-field errors.

describe('reading the document (rule 14)', () => {
  it('reads a string Control from its uischema and bound property', () => {
    expect(formFor(name).form.data).toEqual({
      label: 'Full name',
      description: 'Your name',
      placeholder: 'Jane',
      required: true,
      maxLength: 80,
      multiline: false,
      width: 8,
    });
  });

  it('reads a number Control, leaving absent values out', () => {
    expect(formFor(qty).form.data).toEqual({ required: false, minimum: 0, maximum: 100, step: 5 });
  });

  it('reads a Heading, a HorizontalLayout, a Grid and a HorizontalLayout child', () => {
    expect(formFor(heading).form.data).toEqual({ text: 'Hello', level: 2, size: 4 });
    expect(formFor(row).form.data).toEqual({ label: 'Row', columns: 4 });
    const outer = el({ type: 'VerticalLayout', elements: [grid] });
    expect(formFor(grid, outer).form.data).toEqual({ columns: 12 });
    expect(formFor(rowQty).form.data).toMatchObject({ width: 2 });
  });

  it('reads multiline from options.component', () => {
    const about = el({
      type: 'Control',
      scope: '#/properties/name',
      options: { component: 'textarea' },
    });
    const doc = el({ type: 'VerticalLayout', elements: [about] });
    expect(formFor(about, doc).form.data).toMatchObject({ multiline: true });
  });

  it('leaves out values of the wrong JSON type', () => {
    const odd = el({
      type: 'Control',
      scope: '#/properties/name',
      label: false,
      options: { placeholder: 5, gridItem: { w: '8' } },
    });
    // Deliberately wrong-typed JSON — cast once, as authored input nothing validates.
    const oddSchema = {
      type: 'object',
      properties: { name: { type: 'string', description: 7, maxLength: '80' } },
    } as unknown as JsonSchema;
    const doc = el({ type: 'VerticalLayout', elements: [el({ type: 'Grid', elements: [odd] })] });
    expect(formFor(odd, doc, oddSchema).form.data).toEqual({ required: false, multiline: false });
  });
});

describe('cross-field errors (rule 13)', () => {
  it('flags a maximum below the minimum on maximum', () => {
    expect(inspectorErrors({ minimum: 10, maximum: 5 })).toEqual([
      expect.objectContaining({
        instancePath: '/maximum',
        message: 'Maximum must be at least the minimum.',
      }),
    ]);
  });

  it('reports nothing when the range is valid or incomplete', () => {
    expect(inspectorErrors({ minimum: 5, maximum: 5 })).toEqual([]);
    expect(inspectorErrors({ minimum: 5 })).toEqual([]);
    expect(inspectorErrors({ label: 'x' })).toEqual([]);
  });
});
