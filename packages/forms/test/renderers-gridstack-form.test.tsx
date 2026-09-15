import { NOT_APPLICABLE, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen, within } from '@testing-library/react';
import type { GridHTMLElement } from 'gridstack';
import { describe, it, expect } from 'vitest';
import * as defaults from '../src/renderers-default';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as studio from '../src/renderers-studio';
import { formTester } from '../src/renderers/gridstack/create-grid-renderers';
import { NESTED_FORM_MESSAGE } from '../src/renderers/gridstack/form-renderer';
import {
  FORM_TYPE,
  GRID_LAYOUT_TYPES,
  isGridLayoutType,
  layoutKindOf,
} from '../src/renderers/gridstack/grid-layouts';

// Doc 192 rules 1-5 — the gridstack Form renderer and tester.

const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
const testerContext = { rootSchema: schema, config: {} };
const OTHER_TYPES = ['Grid', 'VerticalLayout', 'HorizontalLayout', 'Heading'] as const;

type Set = typeof defaults;

const el = (element: object) => element as UISchemaElement;
const heading = (text: string, gridItem?: object) =>
  el({ type: 'Heading', text, ...(gridItem ? { options: { gridItem } } : {}) });
const renderersOf = (set: Set) => [
  ...set.controlRenderers,
  ...set.displayRenderers,
  ...set.layoutRenderers,
];

function renderWith(set: Set, uischema: UISchemaElement, data: object = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderersOf(set)}
      cells={set.cells}
    />,
  );
}

async function settle(text: string) {
  await screen.findByText(text);
  await act(async () => {});
}

const rootOf = (container: HTMLElement) => container.querySelector<GridHTMLElement>('.grid-stack');

/** The root grid's engine nodes in reading order. */
const nodesOf = (container: HTMLElement) =>
  (rootOf(container)?.gridstack?.engine.nodes ?? [])
    .map((node) => ({ text: node.el?.textContent, x: node.x, y: node.y, w: node.w }))
    .toSorted((a, b) => (a.y ?? 0) - (b.y ?? 0));

/** Tag names from the container down to the root `.grid-stack`. */
function pathToGrid(container: HTMLElement): string[] {
  const path: string[] = [];
  for (
    let node = rootOf(container)?.parentElement;
    node && node !== container;
    node = node.parentElement
  ) {
    path.unshift(node.tagName);
  }
  return path;
}

describe('gridstack Form renderer (doc 192)', () => {
  describe('dispatch (rule 2)', () => {
    it('adds a fourth layout entry after Grid, VerticalLayout and HorizontalLayout', () => {
      const entries = createGridRenderers().layoutRenderers;
      expect(entries).toHaveLength(4);
      expect(entries[3]?.tester).toBe(formTester);
      expect(entries[3]?.tester({ type: 'Form' }, schema, testerContext)).toBe(1);
      expect(entries[0]?.tester({ type: 'Grid' }, schema, testerContext)).toBe(1);
    });

    it('ranks formTester 1 on a Form and NOT_APPLICABLE on every other layout type and Heading', () => {
      expect(formTester({ type: 'Form' }, schema, testerContext)).toBe(1);
      for (const type of OTHER_TYPES) {
        expect(formTester({ type }, schema, testerContext), type).toBe(NOT_APPLICABLE);
      }
    });

    it('holds exactly one entry matching a Form in renderers/default and renderers/studio', () => {
      for (const set of [defaults, studio]) {
        const matching = renderersOf(set).filter(
          (entry) => entry.tester({ type: 'Form' }, schema, testerContext) > 0,
        );
        expect(matching).toHaveLength(1);
      }
    });
  });

  describe('layout kind (rule 3)', () => {
    it("maps Form to the 'vertical' kind and counts it as a gridstack layout type", () => {
      expect(layoutKindOf('Form')).toBe('vertical');
      expect(isGridLayoutType('Form')).toBe(true);
      expect(layoutKindOf('form')).toBeUndefined();
    });

    it('keeps GRID_LAYOUT_TYPES at one type per kind and exports FORM_TYPE', () => {
      expect(FORM_TYPE).toBe('Form');
      expect(GRID_LAYOUT_TYPES).toEqual({
        grid: 'Grid',
        vertical: 'VerticalLayout',
        horizontal: 'HorizontalLayout',
      });
      expect(Object.isFrozen(GRID_LAYOUT_TYPES)).toBe(true);
    });
  });

  describe('root rendering (rules 1, 4)', () => {
    it('renders a root Form in default as the same one-column static grid as a VerticalLayout, in element order', async () => {
      const { container } = renderWith(
        defaults,
        el({ type: 'Form', elements: [heading('First'), heading('Second')] }),
      );
      await settle('Second');
      const grid = rootOf(container);
      expect(grid).toHaveClass('grid-stack-static');
      expect(grid?.gridstack?.opts.column).toBe(1);
      const nodes = nodesOf(container);
      expect(nodes.map((node) => node.text)).toEqual(['First', 'Second']);
      expect(nodes.every((node) => node.x === 0 && node.w === 1)).toBe(true);
      expect(nodes[1]?.y).toBeGreaterThan(nodes[0]?.y ?? 0);
    });

    it('adds no DOM element of its own and no <form>', async () => {
      const form = renderWith(defaults, el({ type: 'Form', elements: [heading('Inside form')] }));
      await settle('Inside form');
      const formPath = pathToGrid(form.container);
      expect(form.container.querySelector('form')).toBeNull();
      form.unmount();

      const stack = renderWith(
        defaults,
        el({ type: 'VerticalLayout', elements: [heading('Inside form')] }),
      );
      await settle('Inside form');
      expect(formPath).toEqual(pathToGrid(stack.container));
    });

    it('ignores authored options and child gridItem keys exactly like a VerticalLayout', async () => {
      const { container } = renderWith(
        defaults,
        el({
          type: 'Form',
          options: { column: 4, maxRow: 2, float: true },
          elements: [heading('Placed', { x: 3, y: 5, w: 6 }), heading('Next')],
        }),
      );
      await settle('Next');
      const grid = rootOf(container)?.gridstack;
      expect(grid?.opts.column).toBe(1);
      expect(grid?.opts.maxRow).toBe(0);
      expect(nodesOf(container).map(({ text, x, w }) => ({ text, x, w }))).toEqual([
        { text: 'Placed', x: 0, w: 1 },
        { text: 'Next', x: 0, w: 1 },
      ]);
    });

    it('renders a root Form in studio as a draggable grid inside a frame marked data-element-type="Form"', async () => {
      const { container } = renderWith(studio, el({ type: 'Form', elements: [heading('Framed')] }));
      await settle('Framed');
      const frames = container.querySelectorAll('[data-slot="studio-element"]');
      expect(frames).toHaveLength(1);
      expect(frames[0]).toHaveAttribute('data-element-type', 'Form');
      const grid = frames[0]?.querySelector('.grid-stack');
      expect(grid).not.toBeNull();
      expect(grid).not.toHaveClass('grid-stack-static');
      // The layout itself stays interactive; only the elements inside its items are inert (doc 180 rule 17c).
      expect(grid?.closest('[inert]')).toBeNull();
    });

    it('renders nothing when the Form is hidden by a rule', async () => {
      const { container } = renderWith(
        defaults,
        el({
          type: 'Form',
          rule: {
            effect: 'HIDE',
            condition: { scope: '#/properties/name', schema: { const: 'hide' } },
          },
          elements: [heading('Hidden')],
        }),
        { name: 'hide' },
      );
      await act(async () => {});
      expect(rootOf(container)).toBeNull();
      expect(screen.queryByText('Hidden')).toBeNull();
    });
  });

  describe('nested Form (rule 5)', () => {
    const nested = el({ type: 'Form', elements: [heading('Inner')] });

    it('renders "A Form can only be the root element." instead of its elements inside a VerticalLayout', async () => {
      renderWith(defaults, el({ type: 'VerticalLayout', elements: [heading('Outer'), nested] }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(NESTED_FORM_MESSAGE);
      expect(alert).toHaveAttribute('data-slot', 'form-nested-error');
      expect(alert).toHaveClass('text-sm', 'text-destructive');
      expect(screen.getByText('Outer')).toBeInTheDocument();
      expect(screen.queryByText('Inner')).toBeNull();
    });

    it.each([
      ['Grid', el({ type: 'Grid', elements: [heading('Outer'), nested] })],
      ['HorizontalLayout', el({ type: 'HorizontalLayout', elements: [heading('Outer'), nested] })],
      ['Form', el({ type: 'Form', elements: [heading('Outer'), nested] })],
    ])('renders the error inside a %s', async (_parent, uischema) => {
      renderWith(defaults, uischema);
      expect(await screen.findByRole('alert')).toHaveTextContent(NESTED_FORM_MESSAGE);
      expect(screen.getByText('Outer')).toBeInTheDocument();
      expect(screen.queryByText('Inner')).toBeNull();
    });

    it('renders the error in the studio set too, inside the element frame', async () => {
      const { container } = renderWith(
        studio,
        el({ type: 'VerticalLayout', elements: [heading('Outer'), nested] }),
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(NESTED_FORM_MESSAGE);
      const item = container.querySelector<HTMLElement>(
        '[data-slot="studio-grid-item"][data-element-type="Form"]',
      );
      expect(item).not.toBeNull();
      expect(within(item as HTMLElement).getByRole('alert')).toBe(alert);
      expect(screen.queryByText('Inner')).toBeNull();
    });
  });
});
