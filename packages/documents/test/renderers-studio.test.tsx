import { act, fireEvent } from '@testing-library/react';
import type { GridItemHTMLElement, GridStack } from 'gridstack';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as studio from '../src/renderers/studio/index';
import { SELECTED_RING } from '../src/renderers/studio/studio-element';
import { SELECTED_CLASS } from '../src/studio/node-parts';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const ctx = { rootSchema: {}, config: {} } as never;
const topRanks = (type: string) =>
  studio.renderers.map((r) => r.tester({ type } as never, {}, ctx)).toSorted((a, b) => b - a);

const page = (elements: unknown[], options: Record<string, unknown> = {}) => ({
  id: 'root',
  type: 'VerticalLayout',
  elements,
  options,
});

const form = (elements: unknown[], extra: Record<string, unknown> = {}) => ({
  id: 'form',
  type: 'Form',
  elements,
  ...extra,
});

const formTitleOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="form-title"]')!;

describe('renderers/studio (doc 236)', () => {
  it('wraps every spread default entry in StudioElement and outranks Heading and VerticalLayout', () => {
    // Its own Heading, Separator (doc 240) and the placeholder.
    expect(studio.contentRenderers).toHaveLength(defaults.contentRenderers.length + 3);
    // Its own VerticalLayout and Form outrank the spread defaults.
    expect(studio.layoutRenderers).toHaveLength(defaults.layoutRenderers.length + 2);
    // Wrapped: same testers, different renderer components.
    expect(studio.contentRenderers[0]!.tester).toBe(defaults.contentRenderers[0]!.tester);
    expect(studio.contentRenderers[0]!.renderer).not.toBe(defaults.contentRenderers[0]!.renderer);
    for (const type of ['Heading', 'VerticalLayout']) {
      const [top, next] = topRanks(type);
      expect(top, type).toBe(2);
      expect(next, type).toBe(1);
    }
    expect(topRanks('Control')[0]).toBe(0);
  });

  it('renders the root element bare and children in studio-element wrappers', () => {
    const { container } = renderStudioRenderers(page([studioHeading('h1', 'Hello')]));
    const wrappers = container.querySelectorAll('[data-slot="studio-element"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toHaveAttribute('data-element-id', 'h1');
    expect(wrappers[0]).toHaveAttribute('data-element-type', 'Heading');
    expect(container.querySelector('[data-element-id="root"]')).toBeNull();
  });

  it('selects the innermost element on click and marks it with a bare data-selected', () => {
    const { container } = renderStudioRenderers(
      page([{ id: 'inner', type: 'VerticalLayout', elements: [studioHeading('h1', 'Hello')] }]),
    );
    const heading = container.querySelector('[data-element-id="h1"]')!;
    const inner = container.querySelector('[data-element-id="inner"]')!;
    fireEvent.click(heading.querySelector('h2')!);
    expect(heading).toHaveAttribute('data-selected', '');
    expect(inner).not.toHaveAttribute('data-selected');
    // The canvas nodes' own selection ring, under data-[selected]: (rule 16).
    for (const cls of SELECTED_CLASS.split(' '))
      expect(heading).toHaveClass(`data-[selected]:${cls}`);
    fireEvent.click(inner);
    expect(inner).toHaveAttribute('data-selected', '');
    expect(heading).not.toHaveAttribute('data-selected');
  });

  it('renders an element without an id bare and unselectable', () => {
    const { container } = renderStudioRenderers(
      page([{ type: 'Heading', options: { text: 'Anonymous' } }]),
    );
    expect(container.querySelector('[data-slot="studio-element"]')).toBeNull();
    const heading = container.querySelector('[data-slot="heading-element"]')!;
    fireEvent.click(heading);
    expect(heading).toHaveTextContent('Anonymous');
    expect(container.querySelector('[data-selected]')).toBeNull();
  });

  it('is view-only with no provider: nothing selects and the grid is static', () => {
    const { container } = renderStudioRenderers(page([studioHeading('h1', 'Hello')]), {
      editable: false,
    });
    const wrapper = container.querySelector('[data-element-id="h1"]')!;
    fireEvent.click(wrapper);
    expect(wrapper).not.toHaveAttribute('data-selected');
    expect(wrapper).not.toHaveAttribute('class');
    const grid = container.querySelector('[data-slot="studio-vertical-layout"]')!;
    expect(grid).toHaveClass('grid-stack-static');
    expect(grid).not.toHaveClass('nodrag');
  });

  it('renders the VerticalLayout as a one-column gridstack grid with margin = gap / 2', () => {
    const { container } = renderStudioRenderers(
      page([studioHeading('a', 'First'), studioHeading('b', 'Second')], { gap: 'lg' }),
    );
    const grid = container.querySelector<HTMLElement>('[data-slot="studio-vertical-layout"]')!;
    expect(grid).toHaveClass('grid-stack', 'nodrag', 'nopan');
    expect(grid).toHaveAttribute('data-gap', 'lg');
    expect(grid).not.toHaveClass('grid-stack-static');
    expect(grid.style.getPropertyValue('--gs-item-margin-top')).toBe('0.75rem');
    const items = [...grid.querySelectorAll(':scope > .grid-stack-item')];
    expect(items.map((i) => i.getAttribute('gs-id'))).toEqual(['a', 'b']);
    expect(items.map((i) => i.getAttribute('gs-x'))).toEqual(['0', '0']);
    expect(items.every((i) => (i as { gridstackNode?: unknown }).gridstackNode !== undefined)).toBe(
      true,
    );
  });

  it('renders a placeholder naming a Control by label, schema title or scope key, and other elements by type', () => {
    const schema = {
      type: 'object',
      // No renderer takes an object or an array without items, so these stay placeholders (doc 248).
      properties: { age: { type: 'object', title: 'Age' }, name: { type: 'array' } },
    };
    const { container } = renderStudioRenderers(
      page([
        { id: 'c1', type: 'Control', scope: '#/properties/age', label: 'How old?' },
        { id: 'c2', type: 'Control', scope: '#/properties/age' },
        { id: 'c3', type: 'Control', scope: '#/properties/name' },
        { id: 'x1', type: 'Mystery' },
      ]),
      { schema },
    );
    const names = [...container.querySelectorAll('[data-slot="studio-placeholder"]')].map(
      (p) => p.textContent,
    );
    expect(names).toEqual(['How old?', 'Age', 'name', 'Mystery']);
    expect(container.textContent).not.toContain('No applicable renderer');
    expect(container.querySelector('[data-element-id="c1"]')).not.toBeNull();
  });

  it('writes a reorder back through update(layoutId, { elements }) when gridstack moves an item', () => {
    const a = studioHeading('a', 'First');
    const b = studioHeading('b', 'Second');
    const { container, update } = renderStudioRenderers(page([a, b]));
    const grid = container.querySelector('[data-slot="studio-vertical-layout"]') as HTMLElement & {
      gridstack: GridStack;
    };
    const second = grid.querySelector<GridItemHTMLElement>('[gs-id="b"]')!;
    act(() => {
      grid.gridstack.update(second, { y: 0 });
    });
    expect(update).toHaveBeenCalledWith('root', { elements: [b, a] });
    const calls = update.mock.calls.filter(([id]) => id === 'root');
    expect(calls).toHaveLength(1);
  });

  describe('Form (rules 39-44)', () => {
    it('outranks the default Form', () => {
      const [top, next] = topRanks('Form');
      expect(top).toBe(2);
      expect(next).toBe(1);
    });

    it('renders the root Form bare: its title, then its elements in a gridstack grid', () => {
      const { container } = renderStudioRenderers(
        form([studioHeading('a', 'First'), studioHeading('b', 'Second')], { label: 'Eligibility' }),
      );
      expect(container.querySelector('[data-element-id="form"]')).toBeNull();
      const title = container.querySelector('[data-slot="form-title"]')!;
      expect(title.tagName).toBe('H1');
      expect(title).toHaveTextContent('Eligibility');
      const grid = container.querySelector('[data-slot="studio-vertical-layout"]')!;
      expect(grid).toHaveClass('grid-stack');
      expect(
        [...grid.querySelectorAll(':scope > .grid-stack-item')].map((i) => i.getAttribute('gs-id')),
      ).toEqual(['a', 'b']);
    });

    it('shows an Untitled form title, and an empty Form as its drop zone (doc 238 rule 17)', () => {
      const { container } = renderStudioRenderers(form([]));
      const title = container.querySelector('[data-slot="form-title"]')!;
      expect(title).toHaveTextContent('Untitled form');
      expect(title).toHaveClass('text-placeholder');
      expect(title).not.toHaveClass('text-muted-foreground');
      expect(container).toHaveTextContent('Drag items here');
      expect(container.querySelector('[data-slot="studio-vertical-layout"]')).toHaveAttribute(
        'data-empty',
      );
    });

    it("writes a reorder back to the Form's own elements", () => {
      const a = studioHeading('a', 'First');
      const b = studioHeading('b', 'Second');
      const { container, update } = renderStudioRenderers(form([a, b], { label: 'Eligibility' }));
      const grid = container.querySelector(
        '[data-slot="studio-vertical-layout"]',
      ) as HTMLElement & {
        gridstack: GridStack;
      };
      act(() => {
        grid.gridstack.update(grid.querySelector<GridItemHTMLElement>('[gs-id="b"]')!, { y: 0 });
      });
      expect(update).toHaveBeenCalledWith('form', { elements: [b, a] });
    });

    describe('inline title (rule 42b)', () => {
      it('shows a text cursor and edits on one click, committing the trimmed label on Enter', () => {
        const { container, update } = renderStudioRenderers(form([], { label: 'Eligibility' }));
        expect(formTitleOf(container)).toHaveClass('cursor-text');
        // The root Form is unwrapped: the title must take pointer events itself inside the page's pointer-events-none.
        expect(formTitleOf(container)).toHaveClass('pointer-events-auto', 'nodrag', 'nopan');
        fireEvent.click(formTitleOf(container));
        expect(formTitleOf(container)).toHaveAttribute('contenteditable', 'plaintext-only');
        expect(formTitleOf(container).tagName).toBe('H1');
        expect(formTitleOf(container)).toHaveClass('text-h1', 'font-semibold');
        formTitleOf(container).textContent = '  Who can apply ';
        fireEvent.keyDown(formTitleOf(container), { key: 'Enter' });
        expect(update).toHaveBeenCalledWith('form', { label: 'Who can apply' });
        expect(formTitleOf(container)).not.toHaveAttribute('contenteditable');
      });

      it('removes the label when committed empty, and writes nothing when unchanged or cancelled', () => {
        const { container, update } = renderStudioRenderers(form([], { label: 'Eligibility' }));
        fireEvent.click(formTitleOf(container));
        fireEvent.blur(formTitleOf(container));
        fireEvent.click(formTitleOf(container));
        formTitleOf(container).textContent = 'Discarded';
        fireEvent.keyDown(formTitleOf(container), { key: 'Escape' });
        expect(update).not.toHaveBeenCalled();
        expect(formTitleOf(container)).toHaveTextContent('Eligibility');
        fireEvent.click(formTitleOf(container));
        formTitleOf(container).textContent = ' ';
        fireEvent.keyDown(formTitleOf(container), { key: 'Enter' });
        expect(update).toHaveBeenCalledWith('form', { label: undefined });
      });

      it('edits an Untitled form from empty text', () => {
        const { container } = renderStudioRenderers(form([]));
        fireEvent.click(formTitleOf(container));
        expect(formTitleOf(container)).toHaveAttribute('contenteditable', 'plaintext-only');
        expect(formTitleOf(container).textContent).toBe('');
      });

      it('never edits view-only or without an id', () => {
        const viewOnly = renderStudioRenderers(form([], { label: 'Eligibility' }), {
          editable: false,
        });
        fireEvent.click(formTitleOf(viewOnly.container));
        expect(formTitleOf(viewOnly.container)).not.toHaveAttribute('contenteditable');
        expect(formTitleOf(viewOnly.container)).not.toHaveClass('cursor-text');
        expect(formTitleOf(viewOnly.container)).not.toHaveClass('pointer-events-auto');
        viewOnly.unmount();
        const anonymous = renderStudioRenderers({ type: 'Form', label: 'Anonymous', elements: [] });
        fireEvent.click(formTitleOf(anonymous.container));
        expect(formTitleOf(anonymous.container)).not.toHaveAttribute('contenteditable');
      });
    });
  });
});

describe('studio selection ring (rule 16)', () => {
  it("is exactly the canvas nodes' selection ring, under data-[selected]:", () => {
    expect(SELECTED_RING.split(' ')).toEqual(
      SELECTED_CLASS.split(' ').map((cls) => `data-[selected]:${cls}`),
    );
  });
});

describe('studio element frame (doc 236 rule 16b)', () => {
  it('frames every wrapped element with a dashed outline, dashed blue on hover, none while selected', () => {
    const { container } = renderStudioRenderers({
      id: 'form',
      type: 'Form',
      elements: [
        studioHeading('h1', 'Hello'),
        { id: 'c1', type: 'Control', scope: '#/properties/x' },
      ],
    });
    for (const id of ['h1', 'c1']) {
      expect(container.querySelector(`[data-element-id="${id}"]`), id).toHaveClass(
        'outline-dashed',
        'outline-border',
        // Hover keeps the dash and turns it blue: the selection ring's own colour (`ring`, the design system's active
        // border).
        'hover:outline-ring',
        'data-[selected]:outline-none',
      );
      expect(container.querySelector(`[data-element-id="${id}"]`), id).not.toHaveClass(
        'hover:outline-solid',
      );
      // Square: neither the frame nor the selection ring is rounded.
      expect(container.querySelector(`[data-element-id="${id}"]`)!.className, id).not.toMatch(
        /\brounded/,
      );
    }
  });

  it('draws no frame view-only', () => {
    const { container } = renderStudioRenderers(
      { id: 'form', type: 'Form', elements: [studioHeading('h1', 'Hello')] },
      { editable: false },
    );
    expect(container.querySelector('[data-element-id="h1"]')).not.toHaveClass('outline-dashed');
  });

  it('gives a placeholder no border of its own — the wrapper frames it', () => {
    const { container } = renderStudioRenderers({
      id: 'form',
      type: 'Form',
      elements: [{ id: 'c1', type: 'Control', scope: '#/properties/x' }],
    });
    const placeholder = container.querySelector('[data-slot="studio-placeholder"]')!;
    expect(placeholder).not.toHaveClass('border');
    expect(placeholder).not.toHaveClass('border-dashed');
  });
});
