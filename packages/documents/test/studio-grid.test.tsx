import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import type { GridStackNode } from 'gridstack';
import { DDManager } from 'gridstack/dist/dd-manager';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';
import { studioGridEntry } from '../src/renderers/studio/studio-grid';
import type { Governance } from '../src/studio/capabilities/governance';
import { changeEvent, handlersOf, type Grid } from './grid-move';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const form = (elements: unknown[]) => ({ id: 'form', type: 'Form', label: 'Page', elements });
const at = (id: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
  studioHeading(id, id.toUpperCase(), { gridItem: { x, y, ...extra } });
const grid = (elements: unknown[], columns = 2, rows = 2) => ({
  id: 'g',
  type: 'Grid',
  options: { columns, rows },
  elements,
});
const gridOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="studio-grid"]') as Grid;
const targets = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-slot="studio-grid-cell"][data-target]')].map(
    (cell) => `${cell.getAttribute('data-x')},${cell.getAttribute('data-y')}`,
  );

/** Everything allowed, with `overrides` — a template's rules (doc 259). */
const governance = (overrides: Partial<Governance>): Governance =>
  new Proxy(overrides, {
    get: (target, key: string) =>
      (target as Record<string, unknown>)[key] ?? (key === 'restrictions' ? () => [] : () => true),
  }) as Governance;

/** A drag in progress, as gridstack's drag manager holds it, announced by a pointer move (doc 260 rule 16). */
function startDrag(el: HTMLElement) {
  (DDManager as { dragElement?: unknown }).dragElement = { dragging: true, el };
  act(() => {
    document.dispatchEvent(new MouseEvent('mousemove'));
  });
}

function paletteItem(id = 'heading') {
  const el = document.createElement('div');
  el.setAttribute('data-palette-item', id);
  return el;
}

/** What gridstack hands `dropped` for an arrival at `cell`: the clone it added as a widget (jsdom can't drag). */
function dropAt(target: Grid, el: HTMLElement, cell: { x: number; y: number }, previous?: unknown) {
  el.classList.add('grid-stack-item');
  el.innerHTML = '<div class="grid-stack-item-content"><div>clone</div></div>';
  target.appendChild(el);
  const node = target.gridstack.makeWidget(el, { ...cell, w: 1, h: 1 }).gridstackNode;
  act(() => {
    handlersOf(target)['dropped']!(new Event('dropped'), previous, node as GridStackNode);
  });
}

afterEach(() => {
  delete (DDManager as { dragElement?: unknown }).dragElement;
  act(() => {
    document.dispatchEvent(new MouseEvent('mousemove'));
  });
});

describe('studio Grid renderer (doc 260 rules 8-20)', () => {
  describe('rendering (rule 8)', () => {
    it('renders gridstack items with gs-x/gs-y/gs-w/gs-h from gridPlacement', () => {
      const { container } = renderStudioRenderers(
        form([grid([at('a', 1, 0), at('b', 0, 1, { w: 2 })])]),
      );
      const items = [...gridOf(container).querySelectorAll(':scope > .grid-stack-item')];
      expect(items.map((item) => item.getAttribute('gs-id'))).toEqual(['a', 'b']);
      const node = (items[1] as HTMLElement & { gridstackNode?: GridStackNode }).gridstackNode;
      // gridstack drops attributes at their default (h 1) once it has read them, so read its node.
      expect([node?.x, node?.y, node?.w, node?.h]).toEqual([0, 1, 2, 1]);
      expect(items[1]).toHaveAttribute('gs-w', '2');
      expect(gridOf(container).gridstack.getColumn()).toBe(2);
      expect(gridOf(container).gridstack.opts.maxRow).toBe(2);
    });

    it('resizes from every edge and corner (rule 10b)', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      const item = gridOf(container).querySelector(':scope > .grid-stack-item')!;
      const handles = [...item.querySelectorAll(':scope > .ui-resizable-handle')].map((handle) =>
        [...handle.classList].find((name) => /^ui-resizable-[a-z]{1,2}$/.test(name)),
      );
      expect(handles.toSorted()).toEqual(
        ['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w'].map((d) => `ui-resizable-${d}`),
      );
    });

    it("aligns each child's content inside its cell-filling frame (rule 32)", () => {
      const { container } = renderStudioRenderers(
        form([
          {
            ...grid([at('a', 0, 0), at('b', 1, 0, { alignSelf: 'end' })]),
            options: { columns: 2, rows: 2, alignItems: 'center', justifyItems: 'start' },
          },
        ]),
      );
      const [a, b] = [
        ...gridOf(container).querySelectorAll<HTMLElement>(':scope > .grid-stack-item'),
      ];
      expect(a!.style.getPropertyValue('--grid-align-y')).toBe('center');
      expect(a!.style.getPropertyValue('--grid-align-x')).toBe('flex-start');
      expect(b!.style.getPropertyValue('--grid-align-y')).toBe('flex-end');
    });

    it('outranks the default Grid at rank 2', () => {
      expect(studioGridEntry.tester({ type: 'Grid' } as never, {}, {} as never)).toBe(2);
    });

    it('is static with no editor', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]), {
        editable: false,
      });
      expect(gridOf(container).gridstack.opts.staticGrid).toBe(true);
      expect(gridOf(container).gridstack.opts.acceptWidgets).toBe(false);
    });

    it('marks items gs-no-move and gs-no-resize when governance.canDrag is false', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0), at('b', 1, 0)])]), {
        governance: governance({ canDrag: (id) => id !== 'a' }),
      });
      const [a, b] = [...gridOf(container).querySelectorAll(':scope > .grid-stack-item')];
      expect(a).toHaveAttribute('gs-no-move', 'true');
      expect(a).toHaveAttribute('gs-no-resize', 'true');
      // Never moved out of another's way either (rule 10).
      expect(a).toHaveAttribute('gs-locked', 'true');
      expect(b).not.toHaveAttribute('gs-no-move');
    });
  });

  describe('drop targets (rules 15-17)', () => {
    it('draws no visible cell targets outside a drag', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      expect(container.querySelectorAll('[data-slot="studio-grid-cell"]')).toHaveLength(4);
      expect(targets(container)).toEqual([]);
    });

    it('shows a target under every free cell while an accepted drag is in progress', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      startDrag(paletteItem());
      expect(targets(container)).toEqual(['1,0', '0,1', '1,1']);
      // Frame-sized, like an element's outline (rule 17d).
      const target = container.querySelector('[data-slot="studio-grid-cell"][data-target] > div');
      expect(target).toHaveClass('-m-1', 'size-[calc(100%+0.5rem)]', 'bg-black/10');
    });

    it('draws no target under a cell occupied by another item', () => {
      const { container } = renderStudioRenderers(
        form([grid([at('a', 0, 0, { w: 2 }), at('b', 0, 1)])]),
      );
      startDrag(gridOf(container).querySelector<HTMLElement>('[gs-id="b"]')!);
      // b's own cell is free while it is dragged; a's two cells are not.
      expect(targets(container)).toEqual(['0,1', '1,1']);
    });

    it("keeps a target under a moving item's placeholder, so its landing cell darkens like a palette drop's", async () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0), at('b', 0, 1)])]));
      const g = gridOf(container);
      const a = g.querySelector<HTMLElement>('[gs-id="a"]')!;
      startDrag(a);
      // What gridstack does mid-drag: marks the item, moves its node (and the placeholder) to (1,0), writes its attributes.
      await act(async () => {
        a.classList.add('ui-draggable-dragging');
        g.gridstack.engine.nodes.find((n) => n.id === 'a')!.x = 1;
        a.setAttribute('gs-x', '1');
        await Promise.resolve();
      });
      // Its origin (0,0) and its live cell (1,0) both keep a target; b's cell does not.
      expect(targets(container)).toEqual(['0,0', '1,0', '1,1']);
    });

    it('shows no targets while a drag this Grid refuses is in progress', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]), {
        governance: governance({ mayDrop: () => false }),
      });
      startDrag(paletteItem());
      expect(targets(container)).toEqual([]);
    });

    it('outlines every FREE cell at rest, so empty cells never read as padding (rule 17b)', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      const outlined = [...container.querySelectorAll('[data-slot="studio-grid-cell"]')]
        .filter((cell) => cell.firstElementChild?.classList.contains('border-dashed'))
        .map((cell) => `${cell.getAttribute('data-x')},${cell.getAttribute('data-y')}`);
      expect(outlined).toEqual(['1,0', '0,1', '1,1']);
      expect(gridOf(container)).not.toHaveTextContent('Drag items here');
    });

    it('follows a resize live: cells the item grows over lose their outline until it settles (rule 17c)', async () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      const g = gridOf(container);
      const item = g.querySelector<HTMLElement>(':scope > .grid-stack-item')!;
      const outlined = () =>
        [...container.querySelectorAll('[data-slot="studio-grid-cell"]')]
          .filter((cell) => cell.firstElementChild?.classList.contains('border-dashed'))
          .map((cell) => `${cell.getAttribute('data-x')},${cell.getAttribute('data-y')}`);
      // What gridstack does mid-resize: marks the item, moves its node, writes its attributes.
      await act(async () => {
        item.classList.add('ui-resizable-resizing');
        g.gridstack.engine.nodes[0]!.w = 2;
        item.setAttribute('gs-w', '2');
        await Promise.resolve();
      });
      expect(outlined()).toEqual(['0,1', '1,1']);
      await act(async () => {
        item.classList.remove('ui-resizable-resizing');
        await Promise.resolve();
      });
      // Settled, the rendered placement rules again (the drop's write remounts the grid in the studio).
      expect(outlined()).toEqual(['1,0', '0,1', '1,1']);
    });

    it("shows faint cells and 'Drag items here' when empty", () => {
      const { container } = renderStudioRenderers(form([grid([])]));
      expect(gridOf(container)).toHaveTextContent('Drag items here');
      const cells = container.querySelectorAll('[data-slot="studio-grid-cell"] > div');
      expect(cells).toHaveLength(4);
      for (const cell of cells) expect(cell).toHaveClass('border-dashed');
    });
  });

  describe('writes (rules 18-20)', () => {
    it('writes update(gridId, { elements }) with new placements on change', () => {
      const { container, update } = renderStudioRenderers(
        form([grid([at('a', 0, 0), at('b', 1, 0)])]),
      );
      const g = gridOf(container);
      const a = g.gridstack.engine.nodes.find((n) => n.id === 'a')!;
      a.x = 1;
      a.y = 1;
      act(() => handlersOf(g)['change']!(changeEvent(g.gridstack.engine.nodes)));
      expect(update).toHaveBeenCalledTimes(1);
      const [id, patch] = update.mock.calls[0]!;
      expect(id).toBe('g');
      const elements = patch.elements as { id: string; options: { gridItem: unknown } }[];
      expect(elements.map((e) => e.id)).toEqual(['b', 'a']);
      expect(elements[1]!.options.gridItem).toEqual({ x: 1, y: 1 });
    });

    it("hears its OWN change when nested — gridstack dispatches a sub-grid's on the outermost grid (bug B1)", () => {
      const update = vi.fn<(id: string, patch: ElementPatch) => void>();
      const page = (elements: unknown[]) => (
        <StudioEditorProvider update={update} insert={vi.fn()}>
          <JsonForms
            schema={{ type: 'object' }}
            uischema={form([grid(elements)]) as never}
            data={{}}
            renderers={studio.renderers}
            cells={studio.cells}
            validationMode="NoValidation"
          />
        </StudioEditorProvider>
      );
      const view = render(page([at('a', 0, 0)]));
      // A Grid remounted under a LIVE root grid — after its first edit — is linked as the root item's sub-grid.
      view.rerender(page([at('a', 0, 0), at('b', 1, 1)]));
      const g = gridOf(view.container);
      act(() => {
        // gridstack's real path, not the handler: update() → _triggerChangeEvent → _triggerEvent.
        g.gridstack.update(g.querySelector<HTMLElement>('[gs-id="a"]')!, { x: 1 });
      });
      expect(update).toHaveBeenCalledTimes(1);
      const [id, patch] = update.mock.calls[0]!;
      expect(id).toBe('g');
      const gridItems = (patch.elements as { id: string; options: { gridItem: unknown } }[]).map(
        (e) => [e.id, e.options.gridItem],
      );
      expect(gridItems).toEqual([
        ['a', { x: 1, y: 0 }],
        ['b', { x: 1, y: 1 }],
      ]);
    });

    it('ignores change mid-drag', () => {
      const { container, update } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      const g = gridOf(container);
      g.gridstack.engine.nodes[0]!.x = 1;
      (DDManager as { dragElement?: unknown }).dragElement = { dragging: true };
      act(() => handlersOf(g)['change']!(changeEvent(g.gridstack.engine.nodes)));
      expect(update).not.toHaveBeenCalled();
    });

    it('inserts a dropped palette item at the dropped cell', () => {
      const { container, insert } = renderStudioRenderers(form([grid([at('a', 0, 0)])]));
      const g = gridOf(container);
      const clone = paletteItem('separator');
      dropAt(g, clone, { x: 1, y: 1 });
      expect(insert).toHaveBeenCalledWith('g', 0, 'separator', {
        x: 1,
        y: 1,
        // The Grid's own items where gridstack left them: written with the arrival (rule 19).
        displaced: new Map([['a', { x: 0, y: 0, w: 1, h: 1 }]]),
      });
      expect(clone.isConnected).toBe(false);
    });

    it("moves another grid's item to the dropped cell and selects it", () => {
      const { container, move } = renderStudioRenderers(
        form([{ id: 'v', type: 'VerticalLayout', elements: [studioHeading('x', 'X')] }, grid([])]),
        { movable: true },
      );
      const source = container.querySelector(
        '[data-slot="studio-vertical-layout"] [data-slot="studio-vertical-layout"]',
      ) as Grid;
      const item = document.createElement('div');
      item.setAttribute('gs-id', 'x');
      dropAt(gridOf(container), item, { x: 1, y: 0 }, { id: 'x', grid: source.gridstack });
      expect(move).toHaveBeenCalledWith('x', 'g', 0, { x: 1, y: 0, displaced: new Map() });
      expect(container.querySelector('[data-element-id="x"]')).toHaveAttribute('data-selected');
    });

    it('refuses a drop when the Grid has no free cell', () => {
      const { container } = renderStudioRenderers(form([grid([at('a', 0, 0)], 1, 1)]));
      const accepts = gridOf(container).gridstack.opts.acceptWidgets as (el: Element) => boolean;
      expect(accepts(paletteItem())).toBe(false);
    });

    it('asks governance.mayDrop in the accept check', () => {
      const asked: unknown[] = [];
      const { container } = renderStudioRenderers(form([grid([])]), {
        governance: governance({
          mayDrop: (layoutId, source) => {
            asked.push([layoutId, source]);
            return false;
          },
        }),
      });
      const accepts = gridOf(container).gridstack.opts.acceptWidgets as (el: Element) => boolean;
      expect(accepts(paletteItem())).toBe(false);
      expect(asked).toContainEqual(['g', { palette: true }]);
    });
  });
});
