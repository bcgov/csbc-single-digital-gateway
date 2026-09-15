import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { inspectorErrors } from '../src/studio/inspector/inspector-form';
import {
  agree,
  choiceControl,
  choiceSchema,
  docOf,
  el,
  formFor,
  grid,
  heading,
  name,
  qty,
  row,
  rowQty,
} from './inspector-fixtures';

// Doc 187 rules 13-14 — reading the document into the inspector's view model, and cross-field errors.

/** A Control bound to `name` with `options.component` set to `component`. */
const nameAs = (component: string) =>
  el({ type: 'Control', scope: '#/properties/name', options: { component } });

/** The inspector's `component` value for `element`, alone in a root VerticalLayout. */
const read = (element: ReturnType<typeof el>, docSchema?: typeof choiceSchema) =>
  formFor(element, docOf(element), docSchema).form.data['component'];

describe('reading the document (rule 14)', () => {
  it('reads a string Control from its uischema and bound property', () => {
    expect(formFor(name).form.data).toEqual({
      label: 'Full name',
      description: 'Your name',
      placeholder: 'Jane',
      required: true,
      maxLength: 80,
      component: 'input',
      width: 8,
    });
  });

  it('reads a number Control, leaving absent values out', () => {
    expect(formFor(qty).form.data).toEqual({ required: false, minimum: 0, maximum: 100, step: 5 });
  });

  it('reads a Heading, a HorizontalLayout, a Grid and a HorizontalLayout child', () => {
    expect(formFor(heading).form.data).toEqual({ text: 'Hello', level: 2, size: 4 });
    // Doc 193 rule 14: a layout's Gap reads the effective gap, md when none is authored.
    expect(formFor(row).form.data).toEqual({ label: 'Row', columns: 4, gap: 'md' });
    const outer = el({ type: 'VerticalLayout', elements: [grid] });
    expect(formFor(grid, outer).form.data).toEqual({ columns: 12, gap: 'md' });
    expect(formFor(rowQty).form.data).toMatchObject({ width: 2 });
  });

  it('reads component from options.component, defaulting when absent or unrecognised (doc 188 rule 27)', () => {
    expect(read(nameAs('textarea'))).toBe('textarea');
    expect(read(nameAs('fancy'))).toBe('input');

    expect(read(choiceControl({ component: 'radio-group' }), choiceSchema)).toBe('radio-group');
    // A string-only component on a choice reads as what actually renders.
    expect(read(choiceControl({ component: 'textarea' }), choiceSchema)).toBe('combobox');

    expect(formFor(agree).form.data).toEqual({ required: false, component: 'checkbox' });
    const agreeAs = el({
      type: 'Control',
      scope: '#/properties/agree',
      options: { component: 'switch' },
    });
    expect(read(agreeAs)).toBe('switch');
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
    expect(formFor(odd, doc, oddSchema).form.data).toEqual({ required: false, component: 'input' });
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
