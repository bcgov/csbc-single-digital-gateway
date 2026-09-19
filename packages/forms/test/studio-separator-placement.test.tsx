import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { mdiMinus } from '@mdi/js';
import type { GridHTMLElement, GridItemHTMLElement } from 'gridstack';
import { describe, expect, it, vi } from 'vitest';
import {
  createGridRenderers,
  GridEditorProvider,
  type GridEditor,
} from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';
import { DRAG_IN_ATTRIBUTE } from '../src/renderers/gridstack/grid-drag-in';
import { allowedInLayout } from '../src/renderers/gridstack/grid-layouts';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { applyMove } from '../src/studio/layout/apply-layout';
import { createElementIds } from '../src/studio/layout/element-ids';
import { findById, type TreeElement } from '../src/studio/layout/element-tree';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { buildTemplate, PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';
import { useStudioDocument } from '../src/studio/use-studio-document';

// Doc 194 rules 7-13 — Separators are refused in HorizontalLayouts everywhere they could be placed.

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;
// Doc 201 rule 15: a Form's title is required, so every Form fixture carries one.
const formOf = (...elements: object[]) => ({ type: 'Form', label: 'Untitled form', elements });
const noKey = () => 'unused';
const itemsOf = (grid: GridHTMLElement | undefined) =>
  Array.from(grid?.querySelectorAll<GridItemHTMLElement>(':scope > .grid-stack-item') ?? []);

function fixture() {
  const separator = el({ type: 'Separator' });
  const rowHeading = el({ type: 'Heading', text: 'r' });
  const row = el({ type: 'HorizontalLayout', options: { columns: 3 }, elements: [rowHeading] });
  const stackHeading = el({ type: 'Heading', text: 's' });
  const stack = el({ type: 'VerticalLayout', elements: [separator, stackHeading] });
  const grid = el({ type: 'Grid', elements: [] });
  const root = el({ type: 'Form', elements: [row, stack, grid] });
  const ids = createElementIds();
  return {
    separator,
    row,
    rowHeading,
    stack,
    stackHeading,
    grid,
    root,
    ids,
    document: { schema, uischema: root },
  };
}

describe('Separator placement (doc 194)', () => {
  it('allowedInLayout refuses only a Separator in a horizontal layout (rule 7)', () => {
    expect(allowedInLayout('Separator', 'horizontal')).toBe(false);
    expect(allowedInLayout('Separator', 'vertical')).toBe(true);
    expect(allowedInLayout('Separator', 'grid')).toBe(true);
    expect(allowedInLayout('Heading', 'horizontal')).toBe(true);
    expect(allowedInLayout('Control', 'horizontal')).toBe(true);
  });

  it('has a Separator palette template after Heading (rule 13)', () => {
    const keys = PALETTE_TEMPLATES.map((template) => template.key);
    // Doc 207 relaxes rule 13's strict ADJACENCY (user decision 2026-09-18): Rich content now sits
    // between them, so the two content elements are together and the divider follows. The rule's intent —
    // Separator is a Display element offered after Heading — is what is pinned here.
    expect(keys.indexOf('separator')).toBeGreaterThan(keys.indexOf('heading'));
    const template = PALETTE_TEMPLATES.find((entry) => entry.key === 'separator');
    expect(template).toMatchObject({ group: 'display', label: 'Separator', icon: mdiMinus });
    expect(template?.keywords).toEqual(['divider', 'rule', 'line', 'hr']);
    expect(buildTemplate('separator', schema)).toEqual({ element: { type: 'Separator' } });
  });

  describe('insertElement (rule 8)', () => {
    it('inserts a Separator into a VerticalLayout and a Grid but refuses a row, by click or drop', () => {
      const f = fixture();
      const intoStack = insertElement(
        f.document,
        'separator',
        { gridId: f.ids.idOf(f.stack) },
        f.ids,
        noKey,
      );
      expect(intoStack.inserted).toEqual({ type: 'Separator' });
      const intoGrid = insertElement(
        f.document,
        'separator',
        { gridId: f.ids.idOf(f.grid) },
        f.ids,
        noKey,
      );
      expect(intoGrid.inserted?.type).toBe('Separator');

      const click = insertElement(
        f.document,
        'separator',
        { gridId: f.ids.idOf(f.row) },
        f.ids,
        noKey,
      );
      expect(click.inserted).toBeUndefined();
      expect(click.uischema).toBe(f.root);
      expect(click.schema).toBe(schema);
      const drop = insertElement(
        f.document,
        'separator',
        { gridId: f.ids.idOf(f.row), placement: { x: 1, y: 0, w: 1 }, nodes: [] },
        f.ids,
        noKey,
      );
      expect(drop.inserted).toBeUndefined();
      expect(drop.uischema).toBe(f.root);
    });

    it('refuses a click with a row child selected, since the row is the target', () => {
      const f = fixture();
      const target = addTargetId(f.root, f.ids.idOf(f.rowHeading), f.ids);
      expect(target).toBe(f.ids.idOf(f.row));
      const result = insertElement(f.document, 'separator', { gridId: target }, f.ids, noKey);
      expect(result.inserted).toBeUndefined();
      expect(
        insertElement(f.document, 'heading', { gridId: target }, f.ids, noKey).inserted,
      ).toBeDefined();
      expect(buildTemplate('separator', schema)).toBeDefined();
    });
  });

  it('applyMove refuses a Separator into a row but still moves other elements (rule 9)', () => {
    const f = fixture();
    const move = (elementId: string) => ({
      elementId,
      fromGridId: f.ids.idOf(f.stack),
      toGridId: f.ids.idOf(f.row),
      fromNodes: [],
      toNodes: [],
    });
    expect(applyMove(f.root, move(f.ids.idOf(f.separator)), f.ids)).toBe(f.root);
    const moved = applyMove(f.root, move(f.ids.idOf(f.stackHeading)), f.ids);
    expect(findById(moved as TreeElement, f.ids.idOf(f.row), f.ids)?.elements).toHaveLength(2);
    expect(allowedInLayout('Separator', 'horizontal')).toBe(false);
  });

  describe('drag acceptance (rules 10-11)', () => {
    async function renderRow(editor: GridEditor) {
      const f = fixture();
      const set = createGridRenderers({ gridOptions: { staticGrid: false } });
      const view = render(
        <GridEditorProvider value={editor}>
          <JsonForms
            schema={schema}
            uischema={f.root}
            data={{}}
            renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
            cells={[]}
          />
        </GridEditorProvider>,
      );
      await screen.findAllByRole('heading');
      await act(async () => {});
      const roots = Array.from(view.container.querySelectorAll<GridHTMLElement>('.grid-stack'));
      return { f, roots };
    }

    it('asks editor.accepts with the dragged element id or drag-in template', async () => {
      const ids = new WeakMap<object, string>();
      let next = 0;
      const accepts = vi.fn(() => false);
      const editor: GridEditor & { accepts: typeof accepts } = {
        idOf: (element) => {
          if (!ids.has(element)) ids.set(element, `e${++next}`);
          return ids.get(element) as string;
        },
        onGesture: () => {},
        accepts,
      };
      const { f, roots } = await renderRow(editor);
      const [, rowGrid, stackGrid] = roots;
      const accept = rowGrid?.gridstack?.opts.acceptWidgets as (el: Element) => boolean;

      const [separatorItem] = itemsOf(stackGrid);
      expect(accept(separatorItem as Element)).toBe(false);
      expect(accepts).toHaveBeenLastCalledWith('horizontal', {
        elementId: editor.idOf(f.separator),
      });

      const source = document.createElement('div') as unknown as GridItemHTMLElement;
      source.setAttribute(DRAG_IN_ATTRIBUTE, '');
      source.gridstackNode = { w: 12, h: 4, dragInTemplate: 'separator' } as never;
      expect(accept(source)).toBe(false);
      expect(accepts).toHaveBeenLastCalledWith('horizontal', { template: 'separator' });

      accepts.mockReturnValue(true);
      expect(accept(separatorItem as Element)).toBe(true);
    });
  });

  it('the studio document editor answers accepts from the latest document (rule 11)', () => {
    const f = fixture();
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: f.root }));
    const { editor } = result.current;
    const accepts = (editor as GridEditor & { accepts?: GridEditor['onGesture'] })
      .accepts as unknown as ((layout: string, source: object) => boolean) | undefined;
    expect(accepts).toBeTypeOf('function');
    const separatorId = editor.idOf(f.separator);
    expect(accepts?.('horizontal', { elementId: separatorId })).toBe(false);
    expect(accepts?.('vertical', { elementId: separatorId })).toBe(true);
    expect(accepts?.('horizontal', { template: 'separator' })).toBe(false);
    expect(accepts?.('horizontal', { template: 'heading' })).toBe(true);
    expect(accepts?.('horizontal', { elementId: 'unknown' })).toBe(true);
    expect(accepts?.('horizontal', { template: 'unknown' })).toBe(true);
  });

  it('the metaschema allows a Separator in Form, VerticalLayout and Grid but not a row (rules 12, 19)', () => {
    const ajv = createAjv();
    const ok = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;
    const sep = { type: 'Separator' };
    expect(ok(formOf(sep))).toBe(true);
    expect(ok(formOf({ type: 'VerticalLayout', elements: [sep] }))).toBe(true);
    expect(ok(formOf({ type: 'Grid', elements: [sep] }))).toBe(true);
    expect(ok(formOf({ type: 'HorizontalLayout', elements: [sep] }))).toBe(false);
    expect(
      ok(formOf({ type: 'Grid', elements: [{ type: 'HorizontalLayout', elements: [sep] }] })),
    ).toBe(false);
  });
});
