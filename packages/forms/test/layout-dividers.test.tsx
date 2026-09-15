import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import * as studio from '../src/renderers-studio';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { findById, type TreeElement } from '../src/studio/layout/element-tree';
import { el, fieldControl, fieldSchema, formFor, sections } from './inspector-fixtures';

// Doc 194 rules 14-19 — HorizontalLayout `options.dividers`.

const schema: JsonSchema = { type: 'object', properties: {} };
const heading = (text: string) => ({ type: 'Heading', text });
const row = (options?: object) => ({
  type: 'HorizontalLayout',
  ...(options ? { options } : {}),
  elements: [heading('A'), heading('B'), heading('C')],
});
const form = (...elements: object[]) => ({ type: 'Form', elements });

function renderWith(set: typeof defaults, uischema: object) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={[...set.controlRenderers, ...set.displayRenderers, ...set.layoutRenderers]}
      cells={set.cells}
    />,
  );
}

const fillLayout = (container: HTMLElement, type: string) =>
  container.querySelector<HTMLElement>(`[data-slot="fill-layout"][data-layout-type="${type}"]`);
const dividerClasses = (item: Element | undefined) =>
  Array.from(item?.classList ?? []).filter((name) => name.includes('before:'));
/** The gridstack element of the studio layout of `type`. */
const gridOf = (container: HTMLElement, type: string) =>
  container
    .querySelector(`[data-element-type="${type}"]`)
    ?.querySelector<HTMLElement>('.grid-stack');

describe('row dividers (doc 194)', () => {
  describe('fillable (rules 14-15)', () => {
    it('marks a HorizontalLayout with dividers: true and exposes its gap as --fill-gap', () => {
      const { container } = renderWith(defaults, form(row({ dividers: true, gap: 'lg' })));
      const layout = fillLayout(container, 'HorizontalLayout');
      expect(layout).toHaveAttribute('data-dividers');
      expect(layout?.style.getPropertyValue('--fill-gap')).toBe('1.5rem');
      const items = Array.from(layout?.querySelectorAll(':scope > [data-slot="fill-item"]') ?? []);
      expect(items).toHaveLength(3);
      for (const item of items) expect(dividerClasses(item).length).toBeGreaterThan(0);
    });

    it('uses the default md gap for --fill-gap', () => {
      const { container } = renderWith(defaults, form(row({ dividers: true })));
      expect(fillLayout(container, 'HorizontalLayout')?.style.getPropertyValue('--fill-gap')).toBe(
        '1rem',
      );
    });

    it.each([[undefined], [false], ['yes'], [1]])('draws no dividers for dividers: %s', (value) => {
      const { container } = renderWith(
        defaults,
        form(row({ dividers: value, gap: 'lg' }), row({ dividers: true })),
      );
      const [off, on] = Array.from(
        container.querySelectorAll<HTMLElement>('[data-layout-type="HorizontalLayout"]'),
      );
      expect(off).not.toHaveAttribute('data-dividers');
      expect(off?.style.getPropertyValue('--fill-gap')).toBe('');
      const [first] = Array.from(off?.querySelectorAll('[data-slot="fill-item"]') ?? []);
      expect(dividerClasses(first)).toEqual([]);
      expect(on).toHaveAttribute('data-dividers');
    });

    it('ignores dividers on a Grid and a VerticalLayout', () => {
      const { container } = renderWith(
        defaults,
        form(
          { type: 'Grid', options: { dividers: true }, elements: [heading('G')] },
          { type: 'VerticalLayout', options: { dividers: true }, elements: [heading('V')] },
          row({ dividers: true }),
        ),
      );
      expect(fillLayout(container, 'Grid')).not.toHaveAttribute('data-dividers');
      expect(fillLayout(container, 'VerticalLayout')).not.toHaveAttribute('data-dividers');
      expect(fillLayout(container, 'HorizontalLayout')).toHaveAttribute('data-dividers');
    });
  });

  describe('studio (rule 16)', () => {
    it('sets data-dividers on a row grid while dividers is on, and removes it when turned off', async () => {
      const { container, rerender } = renderWith(studio, form(row({ dividers: true })));
      await act(async () => {});
      expect(gridOf(container, 'HorizontalLayout')).toHaveAttribute('data-dividers');

      rerender(
        <JsonForms
          schema={schema}
          uischema={form(row()) as UISchemaElement}
          data={{}}
          renderers={[...studio.displayRenderers, ...studio.layoutRenderers]}
          cells={studio.cells}
        />,
      );
      await act(async () => {});
      expect(gridOf(container, 'HorizontalLayout')).not.toHaveAttribute('data-dividers');
    });

    it('never marks a studio Grid', async () => {
      const { container } = renderWith(
        studio,
        form(
          { type: 'Grid', options: { dividers: true }, elements: [heading('G')] },
          row({ dividers: true }),
        ),
      );
      await act(async () => {});
      expect(gridOf(container, 'Grid')).not.toBeUndefined();
      expect(gridOf(container, 'Grid')).not.toHaveAttribute('data-dividers');
      expect(gridOf(container, 'HorizontalLayout')).toHaveAttribute('data-dividers');
    });

    it('draws the rule on every item but the first in a marked grid', () => {
      const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
      const selector = ".grid-stack[data-dividers] > .grid-stack-item:not([gs-x='0'])::before";
      const start = css.indexOf(selector);
      expect(start).toBeGreaterThan(-1);
      const body = css.slice(css.indexOf('{', start), css.indexOf('}', start));
      expect(body).toContain('var(--app-border)');
      expect(body).toContain('var(--gs-item-margin-top)');
      expect(body).toContain('var(--gs-item-margin-bottom)');
      expect(body).toContain('pointer-events: none');
    });
  });

  describe('inspector (rules 17-18)', () => {
    const plainRow = el({ type: 'HorizontalLayout', options: { dividers: true }, elements: [] });
    const columnsRow = el({ type: 'HorizontalLayout', options: { columns: 3 }, elements: [] });
    const grid = el({ type: 'Grid', elements: [] });
    const root = el({ type: 'Form', elements: [plainRow, columnsRow, grid] });
    const layoutKeys = (element: UISchemaElement) =>
      sections(formFor(element, root, schema).form).find(([label]) => label === 'Layout')?.[1];

    it('adds a small Dividers switch after Gap for HorizontalLayouts only', () => {
      expect(layoutKeys(columnsRow)).toEqual(['columns', 'gap', 'dividers']);
      expect(layoutKeys(grid)).not.toContain('dividers');
      expect(layoutKeys(root)).not.toContain('dividers');
      const { form: inspector } = formFor(columnsRow, root, schema);
      expect(fieldSchema(inspector, 'dividers')).toEqual({ type: 'boolean' });
      expect(fieldControl(inspector, 'dividers')?.options).toEqual({
        component: 'switch',
        size: 'sm',
      });
    });

    it('reads true only for dividers: true', () => {
      expect(formFor(plainRow, root, schema).form.data['dividers']).toBe(true);
      expect(formFor(columnsRow, root, schema).form.data['dividers']).toBe(false);
    });

    it('writes true, removes the key (and an emptied options) when off, and keeps the document when unchanged', () => {
      const { ids, form: inspector } = formFor(columnsRow, root, schema);
      const document = { schema, uischema: root };
      const id = ids.idOf(columnsRow);
      const on = applyInspector(document, id, { ...inspector.data, dividers: true }, ids);
      expect(findById(on.uischema as TreeElement, id, ids)?.options).toEqual({
        columns: 3,
        dividers: true,
      });
      expect(applyInspector(document, id, { ...inspector.data }, ids)).toBe(document);

      const plain = formFor(plainRow, root, schema);
      const plainId = plain.ids.idOf(plainRow);
      const off = applyInspector(
        document,
        plainId,
        { ...plain.form.data, dividers: false },
        plain.ids,
      );
      expect(findById(off.uischema as TreeElement, plainId, plain.ids)).not.toHaveProperty(
        'options',
      );
    });
  });

  describe('metaschema (rule 19)', () => {
    const ajv = createAjv();
    const ok = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;

    it('accepts a boolean dividers on a HorizontalLayout and rejects any other type', () => {
      expect(ok(form(row({ dividers: true })))).toBe(true);
      expect(ok(form(row({ dividers: 'yes' })))).toBe(false);
      expect(JSON.stringify(UISCHEMA_METASCHEMA)).toContain('"dividers":{"description"');
    });
  });
});
