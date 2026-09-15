import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GridHTMLElement } from 'gridstack';
import { describe, it, expect } from 'vitest';
import * as defaults from '../src/renderers-default';
import type { LayoutNode } from '../src/renderers/gridstack/grid-editor';
import { FormStudio } from '../src/studio';
import { applyLayout } from '../src/studio/layout/apply-layout';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { buildTemplate, PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

// Doc 192 rules 6-10, 12 — the Form as the Form Studio's required root.

const ROOT_ERROR = 'The root element must be a Form.';
const GREETING = 'Hello, FormStudio!';

const el = (element: object) => element as UISchemaElement;
const custom = (type: string) =>
  el({ type, elements: [{ type: 'Heading', text: 'Custom', options: { level: 1 } }] });

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(
    document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'),
    'centre panel',
  );
const rootFrame = () =>
  document.querySelector<HTMLElement>('[data-slot="studio-element"][data-element-type="Form"]');
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const crumbNames = () =>
  within(trail())
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);
const currentCrumb = () => trail().querySelector('[aria-current="page"]')?.textContent ?? null;
const paletteItem = (name: string) =>
  within(
    required(document.querySelector<HTMLElement>('[data-studio-palette]'), 'palette'),
  ).getByRole('button', { name });

/** The root grid's items in reading order, by the text they show. */
const rootGridTexts = () =>
  (centre().querySelector<GridHTMLElement>('.grid-stack')?.gridstack?.engine.nodes ?? [])
    .toSorted((a, b) => (a.y ?? 0) - (b.y ?? 0))
    .map((node) => node.el?.textContent ?? '');

describe('Form Studio Form root (doc 192)', () => {
  describe('sample (rule 8)', () => {
    it('seeds the studio with a Form root holding the sample elements', async () => {
      expect(STUDIO_SAMPLE_UISCHEMA.type).toBe('Form');
      expect(STUDIO_SAMPLE_UISCHEMA.elements).toHaveLength(10);
      expect(STUDIO_SAMPLE_UISCHEMA.elements[0]).toMatchObject({ type: 'Heading', text: GREETING });

      render(<FormStudio />);
      expect(await screen.findByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();
      expect(within(centre()).queryByRole('alert')).toBeNull();
    });

    it('frames the root as data-element-type="Form" and names it "Form" in the breadcrumbs', async () => {
      render(<FormStudio />);
      await screen.findByRole('heading', { level: 1, name: GREETING });
      const frame = required(rootFrame(), 'root frame');
      expect(frame).toHaveAttribute('data-element-id', expect.stringMatching(/^el-\d+$/));
      expect(frame.querySelector('.grid-stack')).not.toHaveClass('grid-stack-static');
      expect(crumbNames()).toEqual(['Form']);
    });
  });

  describe('root check (rules 6-7)', () => {
    it('shows "The root element must be a Form." instead of the canvas for a non-Form uischema prop', () => {
      render(<FormStudio uischema={custom('VerticalLayout')} />);
      const alert = within(centre()).getByRole('alert');
      expect(alert).toHaveTextContent(ROOT_ERROR);
      expect(alert).toHaveAttribute('data-slot', 'form-studio-root-error');
      expect(alert).toHaveClass('text-sm', 'text-destructive');
      expect(centre().querySelector('.grid-stack')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Custom' })).toBeNull();
    });

    it('shows the root error in preview too', () => {
      render(<FormStudio uischema={custom('Grid')} />);
      fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
      expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(within(centre()).getByRole('alert')).toHaveTextContent(ROOT_ERROR);
      expect(screen.queryByRole('heading', { name: 'Custom' })).toBeNull();
    });

    it('keeps the dock panels and breadcrumbs mounted while the root error shows', () => {
      render(<FormStudio uischema={custom('HorizontalLayout')} />);
      expect(within(centre()).getByRole('alert')).toHaveTextContent(ROOT_ERROR);
      expect(document.querySelector('[data-studio-palette]')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Bottom panel' })).toBeInTheDocument();
      expect(crumbNames()).toEqual(['HorizontalLayout']);
    });

    it('renders the canvas once the root becomes a Form', async () => {
      const { rerender } = render(<FormStudio uischema={custom('VerticalLayout')} />);
      expect(within(centre()).getByRole('alert')).toHaveTextContent(ROOT_ERROR);

      rerender(<FormStudio uischema={custom('Form')} />);
      expect(await screen.findByRole('heading', { level: 1, name: 'Custom' })).toBeInTheDocument();
      expect(within(centre()).queryByRole('alert')).toBeNull();
      expect(rootFrame()).not.toBeNull();
    });
  });

  describe('editing parity (rules 3, 9-10)', () => {
    it('adds a clicked palette template to the Form root, last and unplaced', async () => {
      render(<FormStudio />);
      await screen.findByRole('heading', { level: 1, name: GREETING });
      const before = rootGridTexts().length;

      fireEvent.click(paletteItem('Heading'));

      expect(currentCrumb()).toBe('Heading');
      expect(crumbNames()).toEqual(['Form']);
      await waitFor(() => expect(rootGridTexts()).toHaveLength(before + 1));
      expect(rootGridTexts().at(-1)).toBe('Heading');
    });

    it('offers no Form palette template', () => {
      const types = PALETTE_TEMPLATES.map(
        ({ key }) => buildTemplate(key, STUDIO_SAMPLE_SCHEMA)?.element.type,
      );
      expect(types).toHaveLength(PALETTE_TEMPLATES.length);
      expect(types).not.toContain('Form');
      expect(PALETTE_TEMPLATES.map(({ key }) => key)).not.toContain('form');
    });

    it('shows only the Label setting in the inspector for the selected Form root', async () => {
      render(<FormStudio />);
      await screen.findByRole('heading', { level: 1, name: GREETING });
      const frame = required(rootFrame(), 'root frame');
      fireEvent.pointerDown(frame);
      fireEvent.pointerUp(frame);

      const inspector = required(
        document.querySelector<HTMLElement>('[data-studio-inspector]'),
        'inspector',
      );
      const label = await within(inspector).findByRole('textbox', { name: 'Label' });
      expect(label).toHaveValue('');
      expect(within(inspector).getByRole('heading', { level: 2 })).toHaveTextContent('Form');
      expect(within(inspector).queryByRole('combobox', { name: 'Width' })).toBeNull();
      expect(within(inspector).queryByRole('combobox', { name: 'Columns' })).toBeNull();
      expect(within(inspector).getAllByRole('textbox')).toHaveLength(1);
    });

    it('writes a layout gesture in the Form root back in y order without gridItem keys', () => {
      const ids = createElementIds();
      const first = el({ type: 'Heading', text: 'First' });
      const second = el({ type: 'Control', scope: '#/properties/a' });
      const root = el({ type: 'Form', elements: [first, second] });
      const node = (element: UISchemaElement, y: number): LayoutNode => ({
        id: ids.idOf(element),
        x: 0,
        y,
        w: 1,
        h: 3,
      });

      const next = applyLayout(root, ids.idOf(root), [node(first, 4), node(second, 0)], ids);

      const elements = (next as TreeElement).elements ?? [];
      expect(next.type).toBe('Form');
      expect(ids.idOf(next)).toBe(ids.idOf(root));
      expect(elements[0]).toBe(second);
      // The same objects: no gridItem was written onto either element.
      expect(elements[1]).toBe(first);
    });
  });

  describe('VerticalLayout unchanged (rule 12)', () => {
    it('still renders a VerticalLayout root through renderers/default outside the studio', async () => {
      const schema: JsonSchema = { type: 'object', properties: {} };
      const { container } = render(
        <JsonForms
          schema={schema}
          uischema={custom('VerticalLayout')}
          data={{}}
          renderers={[
            ...defaults.controlRenderers,
            ...defaults.displayRenderers,
            ...defaults.layoutRenderers,
          ]}
          cells={defaults.cells}
        />,
      );
      expect(await screen.findByRole('heading', { level: 1, name: 'Custom' })).toBeInTheDocument();
      // Doc 193 rule 3: fillable forms lay out with plain CSS.
      expect(
        container.querySelector('[data-slot="fill-layout"][data-layout-type="VerticalLayout"]'),
      ).not.toBeNull();
      expect(container.querySelector('.grid-stack')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
