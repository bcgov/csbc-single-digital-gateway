import { NOT_APPLICABLE, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RendererSet } from '../src/index';
import {
  createGridRenderers,
  GRID_ELEMENT_COMPONENT,
  GridElementDispatch,
} from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';
import { buildComponentMap } from '../src/renderers/gridstack/create-grid-renderers';
import {
  buildGridStackOptions,
  resolveSizeToContent,
  toGridWidgets,
} from '../src/renderers/gridstack/grid-options';

// Doc 180 rules 6-13 — @repo/forms/renderers/gridstack (createGridRenderers factory).

const schema: JsonSchema = { type: 'object', properties: { hidden: { type: 'boolean' } } };
const testerContext = { rootSchema: schema, config: {} };

const heading = (text: string, options?: object) => ({ type: 'Heading', text, options });

const build = (input: Partial<Parameters<typeof buildGridStackOptions>[0]> = {}) =>
  buildGridStackOptions({
    elements: [],
    elementOptions: undefined,
    gridOptions: undefined,
    idPrefix: 'g',
    ...input,
  });

function Extra() {
  return null;
}

/** A consumer grid item shell that wraps the built-in dispatch. */
function StudioItem(props: Record<string, unknown>) {
  return (
    <div data-testid="custom-item">
      <GridElementDispatch {...props} />
    </div>
  );
}

/** A consumer grid item that disables whatever it dispatches (doc 180 rule 17b). */
function DisabledItem(props: Record<string, unknown>) {
  return <GridElementDispatch {...props} enabled={false} />;
}

function renderGrid(uischema: object, set: RendererSet = createGridRenderers(), data = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={data}
      renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
      cells={[]}
    />,
  );
}

describe('createGridRenderers', () => {
  it('returns a RendererSet with one Grid entry in layoutRenderers and empty cells, controlRenderers, displayRenderers', () => {
    const set = createGridRenderers();
    expect(set.cells).toEqual([]);
    expect(set.controlRenderers).toEqual([]);
    expect(set.displayRenderers).toEqual([]);
    expect(set.layoutRenderers).toHaveLength(1);
    expect(set.layoutRenderers[0]?.renderer).toBeDefined();
  });

  it('returns fresh arrays on every call', () => {
    const a = createGridRenderers();
    const b = createGridRenderers();
    expect(a.layoutRenderers).not.toBe(b.layoutRenderers);
    expect(a.layoutRenderers[0]?.renderer).not.toBe(b.layoutRenderers[0]?.renderer);
    a.cells.push({ tester: () => 1, cell: () => null });
    expect(b.cells).toEqual([]);
  });

  it("ranks a { type: 'Grid' } uischema 1 and does not match GridLayout or Heading", () => {
    const tester = createGridRenderers().layoutRenderers[0]?.tester;
    expect(tester?.({ type: 'Grid' }, schema, testerContext)).toBe(1);
    expect(tester?.({ type: 'GridLayout' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(tester?.({ type: 'Heading' }, schema, testerContext)).toBe(NOT_APPLICABLE);
  });

  // Doc 180 rule 7 — factory className lands on the .grid-stack root.
  it('adds the factory className to the .grid-stack root', async () => {
    const { container } = renderGrid(
      { type: 'Grid', elements: [heading('Styled')] },
      createGridRenderers({ className: 'custom-grid' }),
    );
    await screen.findByRole('heading', { name: 'Styled' });
    expect(container.querySelector('.grid-stack')).toHaveClass('grid-stack', 'custom-grid');
  });

  // Doc 180 rule 17b — GridElementDispatch's enabled prop is AND-ed with the Grid context.
  it('disables the dispatched child when a consumer item passes enabled={false}', async () => {
    const controlSchema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
    const uischema = {
      type: 'Grid',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    } as UISchemaElement;
    const renderWith = (set: RendererSet) =>
      render(
        <JsonForms
          schema={controlSchema}
          uischema={uischema}
          data={{}}
          renderers={[...ui.controlRenderers, ...set.layoutRenderers]}
          cells={[]}
        />,
      );

    const { unmount } = renderWith(createGridRenderers());
    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeEnabled();
    unmount();

    renderWith(createGridRenderers({ components: { [GRID_ELEMENT_COMPONENT]: DisabledItem } }));
    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeDisabled();
  });
});

describe('GridStack options mapping', () => {
  it('applies the defaults column 12 and staticGrid true, never forwarding sizeToContent to GridStack', () => {
    // sizeToContent defaults to true but the renderer owns sizing (rules 8, 10c), so GridStack gets false.
    // 1rem rows keep an item's box within one row of its component; a 0.5rem margin spaces
    // neighbours 1rem apart (doc 180 rule 8).
    expect(build()).toEqual({
      column: 12,
      cellHeight: '1rem',
      margin: '0.5rem',
      staticGrid: true,
      sizeToContent: false,
      children: [],
    });
    expect(resolveSizeToContent(undefined)).toBe(true);
  });

  it('lets factory gridOptions override the defaults (staticGrid false)', () => {
    const options = build({ gridOptions: { staticGrid: false, column: 6 } });
    expect(options.staticGrid).toBe(false);
    expect(options.column).toBe(6);
    expect(options.sizeToContent).toBe(false);
    expect(resolveSizeToContent({ sizeToContent: false })).toBe(false);
    expect(resolveSizeToContent({ staticGrid: false })).toBe(true);
  });

  it('lets Grid element options override factory options for allow-listed keys only', () => {
    const options = build({
      gridOptions: { column: 6, margin: 4 },
      elementOptions: {
        column: 4,
        cellHeight: 80,
        margin: 2,
        float: true,
        minRow: 1,
        maxRow: 10,
        animate: false,
      },
    });
    expect(options).toMatchObject({
      column: 4,
      cellHeight: 80,
      margin: 2,
      float: true,
      minRow: 1,
      maxRow: 10,
    });
    expect(options).not.toHaveProperty('animate');
  });

  it('ignores staticGrid, children and subGridOpts supplied through element options', () => {
    const options = build({
      elements: [heading('A') as UISchemaElement],
      elementOptions: {
        staticGrid: false,
        children: [{ id: 'injected' }],
        subGridOpts: { column: 2 },
      },
    });
    expect(options.staticGrid).toBe(true);
    expect(options.children?.map((w) => w.id)).toEqual(['g-0']);
    expect(options).not.toHaveProperty('subGridOpts');
  });

  it("maps each element to a widget { component: 'jsonforms-element', props: { index } } with allow-listed gridItem placement", () => {
    const element = heading('A', {
      gridItem: {
        x: 1,
        y: 2,
        w: 3,
        h: 4,
        minW: 1,
        noMove: true,
        content: '<b>x</b>',
        component: 'evil',
      },
    }) as UISchemaElement;
    expect(GRID_ELEMENT_COMPONENT).toBe('jsonforms-element');
    expect(toGridWidgets([element], 'g')).toEqual([
      {
        id: 'g-0',
        component: 'jsonforms-element',
        props: { index: 0 },
        x: 1,
        y: 2,
        w: 3,
        h: 4,
        minW: 1,
        noMove: true,
      },
    ]);
  });

  it('omits x and y when gridItem does not supply them so gridstack auto-positions', () => {
    const [sized, bare] = toGridWidgets(
      [heading('A', { gridItem: { w: 6 } }), heading('B')] as UISchemaElement[],
      'g',
    );
    expect(sized).toEqual({ id: 'g-0', component: 'jsonforms-element', props: { index: 0 }, w: 6 });
    expect(sized).not.toHaveProperty('x');
    expect(bare).toEqual({ id: 'g-1', component: 'jsonforms-element', props: { index: 1 } });
  });

  it('gives every widget an id unique to its grid prefix and index', () => {
    const elements = [heading('A'), heading('B'), heading('C')] as UISchemaElement[];
    const ids = toGridWidgets(elements, 'a').map((w) => w.id);
    expect(ids).toEqual(['a-0', 'a-1', 'a-2']);
    expect(new Set(ids).size).toBe(3);
    expect(toGridWidgets(elements, 'b').map((w) => w.id)).not.toEqual(ids);
  });
});

describe('Grid components map', () => {
  it('registers GridElementDispatch under GRID_ELEMENT_COMPONENT and merges consumer components', () => {
    expect(buildComponentMap(undefined)).toEqual({ [GRID_ELEMENT_COMPONENT]: GridElementDispatch });
    const merged = buildComponentMap({ Extra });
    expect(merged[GRID_ELEMENT_COMPONENT]).toBe(GridElementDispatch);
    expect(merged['Extra']).toBe(Extra);
  });

  it('lets a consumer component under GRID_ELEMENT_COMPONENT replace the built-in item renderer', async () => {
    expect(
      buildComponentMap({ [GRID_ELEMENT_COMPONENT]: StudioItem })[GRID_ELEMENT_COMPONENT],
    ).toBe(StudioItem);

    renderGrid(
      { type: 'Grid', elements: [heading('One'), heading('Two')] },
      createGridRenderers({ components: { [GRID_ELEMENT_COMPONENT]: StudioItem } }),
    );
    expect(await screen.findAllByTestId('custom-item')).toHaveLength(2);
    // The wrapped dispatch still renders each child inside the custom shell.
    expect(
      screen.getByRole('heading', { name: 'One' }).closest('[data-testid="custom-item"]'),
    ).not.toBeNull();
  });
});

describe('Grid renderer', () => {
  it('renders a .grid-stack root with one item per element, dispatching children through JSONForms', async () => {
    const { container } = renderGrid({
      type: 'Grid',
      elements: [heading('First'), heading('Second', { level: 2 })],
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Second' })).toBeInTheDocument();
    const root = container.querySelector('.grid-stack');
    expect(root).not.toBeNull();
    expect(root?.querySelectorAll('.grid-stack-item')).toHaveLength(2);
  });

  it('renders an empty .grid-stack root when elements is empty', async () => {
    const { container } = renderGrid({ type: 'Grid', elements: [] });
    await act(async () => {});
    expect(container.querySelector('.grid-stack')).not.toBeNull();
    expect(container.querySelectorAll('.grid-stack-item')).toHaveLength(0);
  });

  it('renders nothing when a rule hides the Grid', async () => {
    const { container } = renderGrid(
      {
        type: 'Grid',
        elements: [heading('Hidden child')],
        rule: {
          effect: 'HIDE',
          condition: { scope: '#/properties/hidden', schema: { const: true } },
        },
      },
      createGridRenderers(),
      { hidden: true },
    );
    await act(async () => {});
    expect(container.querySelector('.grid-stack')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it("dispatches a nested Grid's children from the nearest Grid context", async () => {
    const { container } = renderGrid({
      type: 'Grid',
      elements: [heading('Outer'), { type: 'Grid', elements: [heading('Inner', { level: 2 })] }],
    });
    const inner = await screen.findByRole('heading', { level: 2, name: 'Inner' });
    const outer = screen.getByRole('heading', { level: 1, name: 'Outer' });
    const outerRoot = container.querySelector('.grid-stack');
    const innerRoot = inner.closest('.grid-stack');
    expect(innerRoot).not.toBe(outerRoot);
    expect(outerRoot?.contains(innerRoot ?? null)).toBe(true);
    expect(outer.closest('.grid-stack')).toBe(outerRoot);
  });

  // Rule 12b — without the unlink, React destroys the outer grid first and the inner grid's destroy()
  // throws reading the deleted `parentGridNode.grid.opts`.
  it('unmounts a nested Grid cleanly as an independent grid, not a gridstack sub-grid', async () => {
    const { container, unmount } = renderGrid({
      type: 'Grid',
      elements: [heading('Outer'), { type: 'Grid', elements: [heading('Inner', { level: 2 })] }],
    });
    const inner = await screen.findByRole('heading', { level: 2, name: 'Inner' });
    expect(inner.closest('.grid-stack')).not.toHaveClass('grid-stack-nested');
    expect(container.querySelector('.grid-stack-sub-grid')).toBeNull();

    expect(() => unmount()).not.toThrow();
    expect(container.querySelector('.grid-stack')).toBeNull();
  });
});
