import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { GridStack, type GridHTMLElement } from 'gridstack';
import { describe, expect, it, vi } from 'vitest';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as studio from '../src/renderers-studio';
import * as ui from '../src/renderers-ui';
import * as xyflow from '../src/renderers-xyflow';

// Doc 180 rules 15-17 + 15b — @repo/forms/renderers/studio (ui + draggable Grid + xyflow, every entry framed).

const schema: JsonSchema = { type: 'object', properties: { hidden: { type: 'boolean' } } };
const testerContext = { rootSchema: schema, config: {} };
const CATEGORIES = ['cells', 'controlRenderers', 'displayRenderers', 'layoutRenderers'] as const;

// A reference factory call — its entries line up 1:1 with the studio's grid entries.
const grid = createGridRenderers();

interface Entry {
  tester: unknown;
  renderer?: { displayName?: string };
  cell?: { displayName?: string };
}

const studioRenderers = () => [
  ...studio.controlRenderers,
  ...studio.displayRenderers,
  ...studio.layoutRenderers,
];

const matching = (type: string) =>
  studioRenderers().filter((entry) => entry.tester({ type }, schema, testerContext) > 0);

function renderStudio(uischema: object, data: Record<string, unknown> = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={data}
      renderers={studioRenderers()}
      cells={studio.cells}
    />,
  );
}

const frames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="studio-element"]'));

const gridRoot = (container: HTMLElement) =>
  container.querySelector<GridHTMLElement>('.grid-stack');

const nameControl = (options?: object) => ({
  type: 'Control',
  scope: '#/properties/name',
  ...(options ? { options } : {}),
});

const gridOf = (...elements: object[]) => ({ type: 'Grid', elements });

/** The `.grid-stack-item` holding the first studio grid item of `type`. */
const itemOf = (container: HTMLElement, type: string) =>
  container
    .querySelector(`[data-slot="studio-grid-item"][data-element-type="${type}"]`)
    ?.closest<HTMLElement>('.grid-stack-item');

/** The resize handle sides gridstack rendered directly on an item, e.g. `ui-resizable-se`. */
const handleSides = (item: HTMLElement | null | undefined) =>
  Array.from(item?.querySelectorAll(':scope > .ui-resizable-handle') ?? []).map((handle) =>
    [...handle.classList].find((c) => /^ui-resizable-(n|e|s|w|ne|nw|se|sw)$/.test(c)),
  );

describe('renderers/studio composition', () => {
  it("holds ui's entries, then the draggable grid factory's, then xyflow's, 1:1 per category", () => {
    for (const category of CATEGORIES) {
      expect(studio[category], category).toHaveLength(
        ui[category].length + grid[category].length + xyflow[category].length,
      );
    }
    // Grid, VerticalLayout, HorizontalLayout (rule 23), Form (doc 192 rule 2), then Flow and Stage (doc 195 rule 20).
    const firstGridEntry = studio.layoutRenderers.at(-6);
    expect(firstGridEntry?.tester({ type: 'Grid' }, schema, testerContext)).toBe(1);
    expect(studio.layoutRenderers.at(-2)?.tester).toBe(xyflow.layoutRenderers[0]?.tester);
    expect(studio.layoutRenderers.at(-1)?.tester).toBe(xyflow.layoutRenderers[1]?.tester);
  });

  it("does not spread default's entries (no second, tied Grid or Flow entry)", () => {
    // default = ui + CSS layouts + an unsupported Flow, so spreading it as well would tie every layout entry.
    expect(studio.layoutRenderers).toHaveLength(ui.layoutRenderers.length + 6);
    expect(matching('Grid')).toHaveLength(1);
    expect(matching('Flow')).toHaveLength(1);
  });

  it('preserves every tester reference', () => {
    for (const category of CATEGORIES) {
      const sources: readonly Entry[] = [...ui[category], ...grid[category]];
      const targets: readonly Entry[] = studio[category];
      sources.forEach((source, index) =>
        expect(targets[index]?.tester, category).toBe(source.tester),
      );
    }
  });

  it('replaces every renderer and cell with a wrapped component', () => {
    for (const category of CATEGORIES) {
      const sources: readonly Entry[] = [...ui[category], ...grid[category]];
      const targets: readonly Entry[] = studio[category];
      targets.forEach((target, index) => {
        const wrapped = target.renderer ?? target.cell;
        expect(wrapped, category).not.toBe(sources[index]?.renderer ?? sources[index]?.cell);
        expect(wrapped?.displayName, category).toMatch(/^StudioFrame\(/);
      });
    }
    expect(studio.displayRenderers.length).toBeGreaterThan(0);
  });

  it('holds exactly one entry matching Grid and exactly one matching Heading', () => {
    expect(matching('Grid')).toHaveLength(1);
    expect(matching('Heading')).toHaveLength(1);
  });
});

describe('studio frame', () => {
  // Doc 180 rule 16b — the element type is carried as data, never shown as a caption.
  it("wraps a rendered Heading in data-slot='studio-element' with data-element-type and no type caption", () => {
    const { container } = renderStudio({ type: 'Heading', text: 'Title' });
    const [frame] = frames(container);
    expect(frame).toHaveAttribute('data-element-type', 'Heading');
    expect(frame?.querySelector('[data-slot="studio-element-caption"]')).toBeNull();
    expect(frame).toHaveTextContent(/^Title$/);
    expect(frame).toContainElement(screen.getByRole('heading', { name: 'Title' }));
  });

  it('draws a dashed border-border outline with even p-2 padding', () => {
    const { container } = renderStudio({ type: 'Heading', text: 'Title' });
    const [frame] = frames(container);
    expect(frame).toHaveClass('border', 'border-dashed', 'border-border', 'p-2');
    expect(frame).not.toHaveClass('pt-6');
  });

  // Doc 180 rules 16-17b — the Grid keeps its frame; its children are framed by their grid item.
  it('frames the Grid itself and each element inside it', async () => {
    const { container } = renderStudio({
      type: 'Grid',
      elements: [
        { type: 'Heading', text: 'One' },
        { type: 'Heading', text: 'Two' },
      ],
    });
    const one = await screen.findByRole('heading', { name: 'One' });
    expect(screen.getByRole('heading', { name: 'Two' })).toBeInTheDocument();

    const all = frames(container);
    expect(all.map((frame) => frame.dataset['elementType'])).toEqual(['Grid']);
    const [gridFrame] = all;
    expect(gridFrame?.querySelector('.grid-stack')).not.toBeNull();
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="studio-grid-item"]'),
    );
    expect(items.map((item) => item.dataset['elementType'])).toEqual(['Heading', 'Heading']);
    expect(one.closest('[data-slot="studio-grid-item"]')).not.toBeNull();
    expect(gridFrame).toContainElement(one);
  });

  it('passes props through unchanged (Heading level and size still apply inside the frame)', () => {
    renderStudio({ type: 'Heading', text: 'Title', options: { level: 3, size: 5 } });
    const heading = screen.getByRole('heading', { level: 3, name: 'Title' });
    expect(heading).toHaveClass('text-h5', 'font-bold');
    expect(heading.closest('[data-slot="studio-element"]')).not.toBeNull();
  });

  it('renders the frame even when a rule hides the element', () => {
    const { container } = renderStudio(
      {
        type: 'Heading',
        text: 'Title',
        rule: {
          effect: 'HIDE',
          condition: { scope: '#/properties/hidden', schema: { const: true } },
        },
      },
      { hidden: true },
    );
    expect(frames(container)).toHaveLength(1);
    expect(frames(container)[0]).toHaveAttribute('data-element-type', 'Heading');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('studio Grid mode', () => {
  it('renders the studio Grid as draggable/resizable (not grid-stack-static)', async () => {
    const { container } = renderStudio({
      type: 'Grid',
      elements: [{ type: 'Heading', text: 'Drag me' }],
    });
    expect(await screen.findByRole('heading', { name: 'Drag me' })).toBeInTheDocument();
    await act(async () => {});
    const root = container.querySelector('.grid-stack');
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass('grid-stack-static');
  });
});

describe('studio canvas (doc 180 rules 15-17c)', () => {
  const canvasSchema: JsonSchema = {
    type: 'object',
    properties: { name: { type: 'string' }, hidden: { type: 'boolean' } },
  };

  function renderCanvas(uischema: object) {
    return render(
      <JsonForms
        schema={canvasSchema}
        uischema={uischema as UISchemaElement}
        data={{}}
        renderers={studioRenderers()}
        cells={studio.cells}
      />,
    );
  }

  it('marks the grid root and gives every direct item content a dashed border', async () => {
    const { container } = renderCanvas(gridOf({ type: 'Heading', text: 'One' }));
    await screen.findByRole('heading', { name: 'One' });
    expect(gridRoot(container)).toHaveClass(
      'form-studio-grid',
      '[&>.grid-stack-item>.grid-stack-item-content]:rounded-sm',
      '[&>.grid-stack-item>.grid-stack-item-content]:border',
      '[&>.grid-stack-item>.grid-stack-item-content]:border-dashed',
      '[&>.grid-stack-item>.grid-stack-item-content]:border-border',
    );
  });

  it('frames a grid child by its item: padding inside the measured child, no caption, no inner frame', async () => {
    renderCanvas(gridOf({ type: 'Heading', text: 'One' }));
    const heading = await screen.findByRole('heading', { name: 'One' });
    const item = heading.closest<HTMLElement>('[data-slot="studio-grid-item"]');

    expect(item).toHaveAttribute('data-element-type', 'Heading');
    // The measured child: gridstack sizes the item from .grid-stack-item-content's first child.
    expect(item?.parentElement).toHaveClass('grid-stack-item-content');
    expect(item?.parentElement?.firstElementChild).toBe(item);
    expect(item).toHaveClass('p-2');
    expect(item).not.toHaveClass('pt-6');
    expect(item?.querySelector('[data-slot="studio-element-caption"]')).toBeNull();
    expect(item).toHaveTextContent(/^One$/);
    expect(item?.querySelector('[data-slot="studio-element"]')).toBeNull();
  });

  it('renders grid children disabled inside inert, pointer-events-none content', async () => {
    renderCanvas(gridOf(nameControl()));
    const input = await screen.findByRole('textbox', { name: 'Name' });
    const content = input.closest('[data-slot="studio-content"]');

    expect(input).toBeDisabled();
    expect(content).toHaveAttribute('inert');
    expect(content).toHaveClass('pointer-events-none');
  });

  it('keeps a control inert even when options.readonly: false keeps JSONForms from disabling it', async () => {
    renderCanvas(gridOf(nameControl({ readonly: false })));
    const input = await screen.findByRole('textbox', { name: 'Name' });

    // isInherentlyEnabled lets options.readonly override ownProps.enabled…
    expect(input).toBeEnabled();
    // …so inert is what actually keeps the field out of reach.
    expect(input.closest('[data-slot="studio-content"]')).toHaveAttribute('inert');
  });

  it('never makes a nested Grid inert, so its own items stay draggable', async () => {
    const { container } = renderCanvas(gridOf(gridOf({ type: 'Heading', text: 'Inner' })));
    const inner = await screen.findByRole('heading', { name: 'Inner' });

    const gridItem = container.querySelector(
      '[data-slot="studio-grid-item"][data-element-type="Grid"]',
    );
    const gridContent = gridItem?.querySelector('[data-slot="studio-content"]');
    expect(gridContent).not.toBeNull();
    expect(gridContent).not.toHaveAttribute('inert');
    expect(gridContent).not.toHaveClass('pointer-events-none');
    expect(inner.closest('[data-slot="studio-content"]')).toHaveAttribute('inert');
  });

  it('frames root-level elements outside a grid, disabled and inert', () => {
    const { container } = renderCanvas(nameControl());
    const input = screen.getByRole('textbox', { name: 'Name' });
    const [frame] = frames(container);

    expect(frame).toHaveAttribute('data-element-type', 'Control');
    expect(input).toBeDisabled();
    expect(input.closest('[data-slot="studio-content"]')).toHaveAttribute('inert');
    expect(frame).toContainElement(input);
  });

  it('keeps the root Grid frame content interactive', async () => {
    const { container } = renderCanvas(gridOf({ type: 'Heading', text: 'One' }));
    const heading = await screen.findByRole('heading', { name: 'One' });
    expect(gridRoot(container)?.closest('[inert]')).toBeNull();
    // Control case: the Heading inside the grid IS inert, so the check above is not vacuous.
    expect(heading.closest('[inert]')).not.toBeNull();
  });

  it('defaults the grid to left/right handles, with animation off and a 0.5rem margin', async () => {
    const { container } = renderCanvas(gridOf({ type: 'Heading', text: 'One' }));
    await screen.findByRole('heading', { name: 'One' });
    await act(async () => {});
    const root = gridRoot(container);

    expect(root?.gridstack?.opts.resizable?.handles).toBe('e, w');
    expect(root?.gridstack?.opts.animate).toBe(false);
    expect(root).not.toHaveClass('grid-stack-animate');
    expect(root?.style.getPropertyValue('--gs-item-margin-left')).toBe('0.5rem');
    expect(root?.style.getPropertyValue('--gs-item-margin-top')).toBe('0.5rem');
  });

  // Doc 180 rule 17d — handles and sizing mode follow the element type.
  describe('per-element resizing (rule 17d)', () => {
    async function renderMixed() {
      const view = renderCanvas(
        gridOf(
          { type: 'Heading', text: 'One' },
          nameControl(),
          gridOf({ type: 'Heading', text: 'Inner' }),
        ),
      );
      await screen.findByRole('heading', { name: 'Inner' });
      await act(async () => {});
      return view;
    }

    it('gives a Control left/right handles only', async () => {
      const { container } = await renderMixed();
      const control = itemOf(container, 'Control');

      expect(control).toHaveAttribute('gs-resize-handles', 'e, w');
      expect(handleSides(control).toSorted()).toEqual(['ui-resizable-e', 'ui-resizable-w']);
    });

    it('gives a display element (Heading) all eight handles', async () => {
      const { container } = await renderMixed();
      const heading = itemOf(container, 'Heading');

      expect(heading).toHaveAttribute('gs-resize-handles', 'n, ne, e, se, s, sw, w, nw');
      expect(handleSides(heading).toSorted()).toEqual([
        'ui-resizable-e',
        'ui-resizable-n',
        'ui-resizable-ne',
        'ui-resizable-nw',
        'ui-resizable-s',
        'ui-resizable-se',
        'ui-resizable-sw',
        'ui-resizable-w',
      ]);
    });

    it('gives a nested Grid all eight handles too', async () => {
      const { container } = await renderMixed();
      expect(itemOf(container, 'Grid')).toHaveAttribute(
        'gs-resize-handles',
        'n, ne, e, se, s, sw, w, nw',
      );
    });

    it('fits a Control to its content but not a Heading', async () => {
      const resizeToContent = vi.spyOn(GridStack.prototype, 'resizeToContent');
      const { container } = await renderMixed();

      expect(resizeToContent).toHaveBeenCalledWith(itemOf(container, 'Control'));
      expect(resizeToContent).not.toHaveBeenCalledWith(itemOf(container, 'Heading'));
      resizeToContent.mockRestore();
    });
  });
});
