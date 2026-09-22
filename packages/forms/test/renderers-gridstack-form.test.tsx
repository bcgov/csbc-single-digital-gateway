import { NOT_APPLICABLE, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen, within } from '@testing-library/react';
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

// Doc 192 rules 1-5 — the Form renderer and tester. Fillable forms render it as a CSS column (doc 193 rules 3, 10).

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

const FILL_LAYOUT = '[data-slot="fill-layout"]';

/** Tag names from the container down to the first element matching `selector`. */
function tagPath(container: HTMLElement, selector: string): string[] {
  const path: string[] = [];
  for (
    let node = container.querySelector(selector);
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
      // Six since doc 212 appended the Section entry and doc 215 the Service entry AFTER this one, which is why the Form is still at [3].
      expect(entries).toHaveLength(8); // doc 216: +2 for Tabs and TabContentContent
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
    it('renders a root Form in default as the same CSS column as a VerticalLayout, in element order', async () => {
      const { container } = renderWith(
        defaults,
        el({ type: 'Form', elements: [heading('First'), heading('Second')] }),
      );
      await settle('Second');
      const column = container.querySelector<HTMLElement>(FILL_LAYOUT);
      expect(column).toHaveAttribute('data-layout-type', 'Form');
      expect(column).toHaveClass('flex', 'flex-col', 'gap-4');
      expect(Array.from(column?.children ?? []).map((item) => item.textContent)).toEqual([
        'First',
        'Second',
      ]);
      expect(container.querySelector('.grid-stack')).toBeNull();
    });

    it('adds no DOM element of its own but the page container, and no <form>', async () => {
      const form = renderWith(defaults, el({ type: 'Form', elements: [heading('Inside form')] }));
      await settle('Inside form');
      const formPath = tagPath(form.container, FILL_LAYOUT);
      expect(formPath.length).toBeGreaterThan(0);
      expect(form.container.querySelector('form')).toBeNull();
      // Doc 184 rule 17b: a root Form with no runner around it declares the `fill-page` container — the ONE element
      // it adds over a VerticalLayout, so the path is the stack's with that wrapper in front.
      expect(form.container.querySelector(FILL_LAYOUT)?.parentElement).toHaveAttribute(
        'data-slot',
        'fill-page',
      );
      form.unmount();

      const stack = renderWith(
        defaults,
        el({ type: 'VerticalLayout', elements: [heading('Inside form')] }),
      );
      await settle('Inside form');
      expect(formPath).toEqual(['DIV', ...tagPath(stack.container, FILL_LAYOUT)]);
    });

    it('ignores authored options and child gridItem keys exactly like a VerticalLayout', async () => {
      const { container } = renderWith(
        defaults,
        el({
          type: 'Form',
          options: { column: 4, maxRow: 2, float: true },
          elements: [heading('Placed', { x: 3, y: 5, w: 6, h: 4 }), heading('Next')],
        }),
      );
      await settle('Next');
      const column = container.querySelector<HTMLElement>(FILL_LAYOUT);
      expect(column).toHaveClass('flex', 'flex-col');
      expect(column).not.toHaveClass('grid');
      const items = Array.from(column?.children ?? []);
      expect(items.map((item) => item.textContent)).toEqual(['Placed', 'Next']);
      for (const item of items) expect(item.getAttribute('style')).toBeNull();
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
      expect(container.querySelector(FILL_LAYOUT)).toBeNull();
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
