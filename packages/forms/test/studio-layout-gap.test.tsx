import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as studio from '../src/renderers-studio';
import { NESTED_FORM_MESSAGE } from '../src/renderers/gridstack/form-renderer';
import { buildGridStackOptions } from '../src/renderers/gridstack/grid-options';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldAccepts } from '../src/studio/inspector/field-accepts';
import * as inspectorFields from '../src/studio/inspector/inspector-fields';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds } from '../src/studio/layout/element-ids';
import { findById, type TreeElement } from '../src/studio/layout/element-tree';
import { el, fieldSchema, formFor, heading, name, sections } from './inspector-fixtures';

// Doc 193 rules 10-15 — gap in the studio: gridstack margin, nested-Form signal and the inspector Gap field.

const schema: JsonSchema = { type: 'object', properties: {} };

const build = (layout: 'grid' | 'vertical' | 'horizontal', elementOptions?: object) =>
  buildGridStackOptions({
    elements: [],
    elementOptions,
    gridOptions: undefined,
    idPrefix: 'g',
    layout,
  });

const renderStudio = (uischema: object) =>
  render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={[
        ...studio.controlRenderers,
        ...studio.displayRenderers,
        ...studio.layoutRenderers,
      ]}
      cells={studio.cells}
    />,
  );

/** The inspector form and write-back for `element` inside `uischema`. */
function inspect(element: UISchemaElement, uischema: UISchemaElement) {
  const ids = createElementIds();
  const document = { schema, uischema };
  const id = ids.idOf(element);
  const form = inspectorForm(document, id, ids);
  if (!form) throw new Error('no inspector form');
  const write = (values: Record<string, unknown>) => {
    const next = applyInspector(document, id, { ...form.data, ...values }, ids);
    return { next, element: findById(next.uischema as TreeElement, id, ids) };
  };
  return { document, form, write };
}

const layoutKeys = (form: ReturnType<typeof formFor>['form']) =>
  sections(form).find(([label]) => label === 'Layout')?.[1] ?? [];

describe('studio layout gap (doc 193)', () => {
  describe('gridstack margin (rules 11-12)', () => {
    it('forces margin = gap / 2 for Grid, VerticalLayout and HorizontalLayout, md by default', () => {
      for (const layout of ['grid', 'vertical', 'horizontal'] as const) {
        expect(build(layout).margin, layout).toBe('0.5rem');
        expect(build(layout, { gap: 'lg' }).margin, layout).toBe('0.75rem');
        expect(build(layout, { gap: 'none' }).margin, layout).toBe('0rem');
        expect(build(layout, { gap: 'bogus' }).margin, layout).toBe('0.5rem');
      }
    });

    it('no longer reads a Grid authored options.margin', () => {
      expect(build('grid', { margin: '3rem' }).margin).toBe('0.5rem');
      expect(build('grid', { margin: '3rem', gap: 'xl' }).margin).toBe('1rem');
      // The rest of the Grid allow-list still applies.
      expect(build('grid', { column: 6, float: true })).toMatchObject({ column: 6, float: true });
    });

    it('renders a studio Form grid with its gap margin', async () => {
      const { container } = renderStudio({
        type: 'Form',
        options: { gap: 'xl' },
        elements: [{ type: 'Heading', text: 'Spaced' }],
      });
      await screen.findByRole('heading', { name: 'Spaced' });
      const grid = container.querySelector<HTMLElement>('.grid-stack');
      expect(grid?.style.getPropertyValue('--gs-item-margin-top')).toBe('1rem');
      expect(grid?.style.getPropertyValue('--gs-item-margin-left')).toBe('1rem');
    });
  });

  describe('nesting signal (rule 10)', () => {
    it('still shows the nested-Form error inside studio gridstack layouts', async () => {
      renderStudio({
        type: 'VerticalLayout',
        elements: [
          { type: 'Heading', text: 'Outer' },
          { type: 'Form', elements: [{ type: 'Heading', text: 'Inner' }] },
        ],
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(NESTED_FORM_MESSAGE);
      expect(screen.queryByText('Inner')).toBeNull();
    });
  });

  describe('inspector Gap field (rules 13-15)', () => {
    const row = el({ type: 'HorizontalLayout', options: { columns: 3 }, elements: [] });
    const grid = el({ type: 'Grid', elements: [row, name, heading] });
    const stack = el({ type: 'VerticalLayout', elements: [] });
    const form = el({ type: 'Form', elements: [grid, stack] });

    it('applies to every layout kind in the Layout section after Columns, never to a Control or Heading', () => {
      expect(layoutKeys(formFor(form, form).form)).toEqual(['gap']);
      expect(layoutKeys(formFor(stack, form).form)).toEqual(['gap']);
      expect(layoutKeys(formFor(grid, form).form)).toEqual(['columns', 'gap']);
      // A row inside a Grid also gets Width, after Gap.
      expect(layoutKeys(formFor(row, form).form)).toEqual(['columns', 'gap', 'width']);
      for (const element of [name, heading]) {
        const keys = sections(formFor(element, form).form).flatMap(([, fields]) => fields);
        expect(keys).not.toContain('gap');
      }
    });

    it('offers the six titled options and reads md when no gap is authored', () => {
      const built = formFor(stack, form).form;
      expect(fieldSchema(built, 'gap')).toEqual({
        type: 'string',
        oneOf: [
          { const: 'none', title: 'None' },
          { const: 'xs', title: 'XS · 0.25rem' },
          { const: 'sm', title: 'SM · 0.5rem' },
          { const: 'md', title: 'MD · 1rem' },
          { const: 'lg', title: 'LG · 1.5rem' },
          { const: 'xl', title: 'XL · 2rem' },
        ],
      });
      expect(built.data['gap']).toBe('md');

      const authored = el({ type: 'VerticalLayout', options: { gap: 'lg' }, elements: [] });
      expect(formFor(authored, el({ type: 'Form', elements: [authored] })).form.data['gap']).toBe(
        'lg',
      );
      const invalid = el({ type: 'VerticalLayout', options: { gap: 'huge' }, elements: [] });
      expect(formFor(invalid, el({ type: 'Form', elements: [invalid] })).form.data['gap']).toBe(
        'md',
      );
    });

    it('writes a non-default gap and removes options.gap for md', () => {
      const plain = el({ type: 'VerticalLayout', elements: [] });
      const { element: spaced } = inspect(plain, el({ type: 'Form', elements: [plain] })).write({
        gap: 'lg',
      });
      expect(spaced?.options).toEqual({ gap: 'lg' });

      const withGap = el({ type: 'Grid', options: { gap: 'lg', column: 6 }, elements: [] });
      const back = inspect(withGap, el({ type: 'Form', elements: [withGap] })).write({ gap: 'md' });
      expect(back.element?.options).toEqual({ column: 6 });

      const onlyGap = el({ type: 'HorizontalLayout', options: { gap: 'xs' }, elements: [] });
      const cleared = inspect(onlyGap, el({ type: 'Form', elements: [onlyGap] })).write({
        gap: 'md',
      });
      expect(cleared.element).not.toHaveProperty('options');
    });

    it('returns the same document when the gap did not change', () => {
      const authored = el({ type: 'Grid', options: { gap: 'sm' }, elements: [] });
      const { document, write } = inspect(authored, el({ type: 'Form', elements: [authored] }));
      expect(write({ gap: 'sm' }).next).toBe(document);
      expect(write({ gap: 'huge' }).next).toBe(document);
    });

    it('keeps fieldAccepts behaviour after moving it to field-accepts.ts', () => {
      expect(inspectorFields).not.toHaveProperty('fieldAccepts');
      const gapSchema = fieldSchema(formFor(stack, form).form, 'gap') ?? {};
      expect(fieldAccepts(gapSchema, 'xl')).toBe(true);
      expect(fieldAccepts(gapSchema, 'huge')).toBe(false);
      expect(fieldAccepts(gapSchema, 3)).toBe(false);
      expect(fieldAccepts(gapSchema, undefined)).toBe(true);
      expect(fieldAccepts({ type: 'number', minimum: 1, multipleOf: 1 }, 2)).toBe(true);
      expect(fieldAccepts({ type: 'number', minimum: 1, multipleOf: 1 }, 0.5)).toBe(false);
    });
  });
});
