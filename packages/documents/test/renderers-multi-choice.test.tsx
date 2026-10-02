import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const choices = (title: string) => ({
  type: 'array',
  title,
  uniqueItems: true,
  items: {
    oneOf: [
      { const: 'north', title: 'North', description: 'Up top' },
      { const: 'interior', title: 'Interior' },
      { const: 'coast', title: 'Coast' },
    ],
  },
});

const schema = {
  type: 'object',
  properties: {
    regions: { ...choices('Regions'), description: 'Pick any' },
    picked: choices('Picked'),
    // Ajv refuses an empty oneOf, so the not-a-choice case is a numeric const.
    numeric: { type: 'array', title: 'Numeric', items: { oneOf: [{ const: 1 }] } },
  },
  required: ['picked'],
};

const control = (scope: string, options: Record<string, unknown> = {}, extra = {}) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
  ...extra,
});
const BOXES = { component: 'checkbox-group' };

function renderControl(
  uischema: Record<string, unknown>,
  data: Record<string, unknown> = {},
  props: { readonly?: boolean } = {},
) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
      {...props}
    />,
  );
  const field = () => view.container.querySelector<HTMLElement>('[data-slot="choice-field"]');
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, field, lastData, onChange };
}

const ctx = { rootSchema: schema, config: {} } as never;
const ranksFor = (uischema: Record<string, unknown>) =>
  defaults.renderers
    .map((r) => r.tester(uischema as never, schema as never, ctx))
    .toSorted((a, b) => b - a);

const chips = (field: HTMLElement) =>
  [...field.querySelectorAll('[data-slot="combobox-chip"]')].map((c) => c.textContent);

describe('multi-choice controls (doc 245)', () => {
  describe('dispatch (rules 1-3)', () => {
    it('ranks one renderer 1 for an array choice, whatever the component, never tied', () => {
      for (const options of [{}, { component: 'multi-select' }, BOXES, { component: 'x' }]) {
        const [top, next] = ranksFor(control('regions', options));
        expect(top).toBe(1);
        expect(next).toBeLessThan(1);
      }
    });

    it('draws a Multi-select by default, for multi-select and an unknown component; a Checkbox group for checkbox-group', () => {
      for (const options of [{}, { component: 'multi-select' }, { component: 'x' }]) {
        const view = renderControl(control('regions', options));
        expect(view.field()).toHaveAttribute('data-component', 'multi-select');
        expect(screen.getByRole('combobox', { name: 'Regions' })).toBeInTheDocument();
        view.unmount();
      }
      const boxes = renderControl(control('regions', BOXES));
      expect(boxes.field()).toHaveAttribute('data-component', 'checkbox-group');
      expect(screen.getByRole('group', { name: 'Regions' })).toBeInTheDocument();
    });

    it('matches nothing for an array that is not a choice', () => {
      expect(ranksFor(control('numeric'))[0]).toBeLessThan(1);
    });
  });

  describe('layout (rules 7-8)', () => {
    it('stacks label, description, then the control, and marks a required one', () => {
      const { field } = renderControl(control('regions', BOXES));
      const order = [...field()!.children].map((c) => c.getAttribute('data-slot'));
      expect(order).toEqual(['field-label', 'field-description', 'checkbox-group']);
      expect(screen.getByRole('group', { name: 'Regions' })).toHaveAccessibleDescription(
        'Pick any',
      );
      const required = renderControl(control('picked'));
      expect(required.field()!.querySelector('label')).toHaveTextContent('Picked *');
      expect(within(required.field()!).getByRole('combobox')).toHaveAttribute(
        'aria-required',
        'true',
      );
    });

    it('names the control by its key when the label is empty', () => {
      renderControl(control('regions', BOXES, { label: '' }));
      expect(screen.getByRole('group', { name: 'regions' })).toBeInTheDocument();
    });

    it('is disabled when not enabled, and renders nothing when hidden', () => {
      const select = renderControl(control('regions'), {}, { readonly: true });
      expect(screen.getByRole('combobox')).toBeDisabled();
      select.unmount();
      const boxes = renderControl(control('regions', BOXES), {}, { readonly: true });
      for (const box of screen.getAllByRole('checkbox'))
        expect(box).toHaveAttribute('data-disabled');
      boxes.unmount();
      const rule = { effect: 'HIDE', condition: { scope: '#', schema: {} } };
      expect(renderControl(control('regions', {}, { rule })).field()).toBeNull();
    });
  });

  describe('Multi-select (rules 5-6, 9-11)', () => {
    it('shows a chip per chosen option in authoring order, never an unknown const', () => {
      const { field, onChange } = renderControl(control('regions'), {
        regions: ['coast', 'gold', 'north'],
      });
      expect(chips(field()!)).toEqual(['North', 'Coast']);
      for (const [next] of onChange.mock.calls) {
        expect(next).toEqual({ regions: ['coast', 'gold', 'north'] });
      }
    });

    it('lists every option with descriptions and adds picks in authoring order', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('regions'), { regions: ['coast'] });
      await user.click(screen.getByRole('combobox', { name: 'Regions' }));
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options).toHaveLength(3);
      const description = options[0]!.querySelector('[data-slot="choice-option-description"]');
      expect(description).toHaveTextContent('Up top');
      expect(description).toHaveClass('text-muted-foreground', 'text-xs');
      await user.click(within(listbox).getByRole('option', { name: /North/ }));
      await waitFor(() => expect(lastData()).toEqual({ regions: ['north', 'coast'] }));
    });

    it('removes a chip, and writes undefined — never [] — when the last one goes', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('regions'), { regions: ['north'] });
      await user.click(screen.getByRole('button', { name: 'Remove North' }));
      await waitFor(() => expect(lastData()).toEqual({}));
    });

    it('offers Clear all only when the field is optional', async () => {
      const user = userEvent.setup();
      const optional = renderControl(control('regions'), { regions: ['north', 'coast'] });
      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitFor(() => expect(optional.lastData()).toEqual({}));
      optional.unmount();
      renderControl(control('picked'), { picked: ['north'] });
      expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Remove North' })).toBeInTheDocument();
    });
  });

  describe('Checkbox group (rules 5-6, 12-13)', () => {
    it('draws one box per option, named by its title, ticking the data', () => {
      renderControl(control('regions', BOXES), { regions: ['interior', 'gold'] });
      const group = screen.getByRole('group', { name: 'Regions' });
      const boxes = within(group).getAllByRole('checkbox');
      expect(boxes.map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
      expect(within(group).getByRole('checkbox', { name: 'North' })).toHaveAccessibleDescription(
        'Up top',
      );
    });

    it('ticks by title in authoring order, and writes undefined when the last is unticked', async () => {
      const { lastData } = renderControl(control('regions', BOXES), { regions: ['coast'] });
      fireEvent.click(screen.getByText('North'));
      await waitFor(() => expect(lastData()).toEqual({ regions: ['north', 'coast'] }));
      fireEvent.click(screen.getByText('North'));
      fireEvent.click(screen.getByText('Coast'));
      await waitFor(() => expect(lastData()).toEqual({}));
    });
  });
});
