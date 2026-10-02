import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const schema = {
  type: 'object',
  properties: {
    region: {
      type: 'string',
      title: 'Region',
      description: 'Where you live',
      oneOf: [
        { const: 'north', title: 'North', description: 'Up top' },
        { const: 'interior', title: 'Interior' },
        { const: 'coast', title: 'Coast' },
      ],
    },
    plan: {
      type: 'string',
      title: 'Plan',
      oneOf: [
        { const: 'basic', title: 'Basic' },
        { const: 'pro', title: 'Pro' },
      ],
    },
    // Ajv refuses an empty oneOf outright, so the not-a-choice case is a type its consts contradict (doc 246).
    contradicted: { type: 'string', title: 'Contradicted', oneOf: [{ const: 1 }] },
    size: {
      type: 'integer',
      title: 'Size',
      oneOf: [
        { const: 1, title: 'Small' },
        { const: 2, title: 'Medium' },
      ],
    },
  },
  required: ['plan'],
};

const control = (scope: string, options: Record<string, unknown> = {}, extra = {}) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
  ...extra,
});
const RADIOS = { component: 'radio-group' };

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

describe('single-choice controls (doc 244)', () => {
  describe('dispatch (rules 1-3)', () => {
    it('ranks one renderer 1 for a choice, whatever the component, never tied', () => {
      for (const options of [{}, { component: 'select' }, RADIOS, { component: 'mystery' }]) {
        const [top, next] = ranksFor(control('region', options));
        expect(top).toBe(1);
        expect(next).toBeLessThan(1);
      }
    });

    it('draws a Select by default, for select and for an unknown component; a Radio group for radio-group', () => {
      for (const options of [{}, { component: 'select' }, { component: 'mystery' }]) {
        const view = renderControl(control('region', options));
        expect(view.field()).toHaveAttribute('data-component', 'select');
        expect(screen.getByRole('combobox', { name: 'Region' })).toBeInTheDocument();
        view.unmount();
      }
      const radios = renderControl(control('region', RADIOS));
      expect(radios.field()).toHaveAttribute('data-component', 'radio-group');
      expect(screen.getByRole('radiogroup', { name: 'Region' })).toBeInTheDocument();
    });

    it('matches nothing for a choice schema that is not one', () => {
      expect(ranksFor(control('contradicted'))[0]).toBeLessThan(1);
    });
  });

  describe('layout (rules 9-11)', () => {
    it('stacks label, description, then the control', () => {
      const { field } = renderControl(control('region', RADIOS));
      const order = [...field()!.children].map((c) => c.getAttribute('data-slot'));
      expect(order).toEqual(['field-label', 'field-description', 'radio-group']);
    });

    it('describes the control and marks a required one', () => {
      renderControl(control('region'));
      expect(screen.getByRole('combobox', { name: 'Region' })).toHaveAccessibleDescription(
        'Where you live',
      );
      const required = renderControl(control('plan'));
      const label = required.field()!.querySelector('label')!;
      expect(label).toHaveTextContent('Plan *');
      expect(label.querySelector('[aria-hidden="true"]')).toHaveTextContent('*');
      expect(within(required.field()!).getByRole('combobox')).toHaveAttribute(
        'aria-required',
        'true',
      );
    });

    it('names the control by its key when the label is empty', () => {
      renderControl(control('region', RADIOS, { label: '' }));
      expect(screen.getByRole('radiogroup', { name: 'region' })).toBeInTheDocument();
      expect(screen.queryByText('Region')).toBeNull();
    });

    it('is disabled when not enabled, and renders nothing when hidden', () => {
      const select = renderControl(control('region'), {}, { readonly: true });
      expect(screen.getByRole('combobox')).toBeDisabled();
      select.unmount();
      const radios = renderControl(control('region', RADIOS), {}, { readonly: true });
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toHaveAttribute('data-disabled');
      }
      radios.unmount();
      const rule = { effect: 'HIDE', condition: { scope: '#', schema: {} } };
      const hidden = renderControl(control('region', {}, { rule }));
      expect(hidden.field()).toBeNull();
    });
  });

  describe('Select (rules 6-7, 12-14)', () => {
    it('shows the selected title, and empty for data that is no option', () => {
      const a = renderControl(control('region'), { region: 'coast' });
      expect(screen.getByRole('combobox', { name: 'Region' })).toHaveValue('Coast');
      a.unmount();
      const b = renderControl(control('region'), { region: 'gold' });
      expect(screen.getByRole('combobox', { name: 'Region' })).toHaveValue('');
      for (const [next] of b.onChange.mock.calls) expect(next).toEqual({ region: 'gold' });
    });

    it('lists every option, a description as a second line, and writes the picked const', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('region'));
      await user.click(screen.getByRole('combobox', { name: 'Region' }));
      const listbox = await screen.findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options).toHaveLength(3);
      const description = options[0]!.querySelector('[data-slot="choice-option-description"]');
      expect(description).toHaveTextContent('Up top');
      expect(description).toHaveClass('text-muted-foreground', 'text-xs');
      expect(options[1]!.querySelector('[data-slot="choice-option-description"]')).toBeNull();
      await user.click(within(listbox).getByRole('option', { name: /Interior/ }));
      await waitFor(() => expect(lastData()).toEqual({ region: 'interior' }));
    });

    it('clears an optional Select to undefined; a required one has no clear button', async () => {
      const user = userEvent.setup();
      const optional = renderControl(control('region'), { region: 'coast' });
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      await waitFor(() => expect(optional.lastData()).toEqual({}));
      optional.unmount();
      renderControl(control('plan'), { plan: 'pro' });
      expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    });
  });

  describe('Radio group (rules 6-7, 15-16)', () => {
    it('draws one radio per option, named by its title, checking the data', () => {
      renderControl(control('region', RADIOS), { region: 'interior' });
      const group = screen.getByRole('radiogroup', { name: 'Region' });
      const radios = within(group).getAllByRole('radio');
      expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
      expect(within(group).getByRole('radio', { name: 'North' })).toHaveAccessibleDescription(
        'Up top',
      );
    });

    it('checks nothing for data that is no option', () => {
      renderControl(control('region', RADIOS), { region: 'gold' });
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toHaveAttribute('aria-checked', 'false');
      }
    });

    it('writes the const of a radio picked by its title', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('region', RADIOS));
      await user.click(screen.getByText('Coast'));
      await waitFor(() => expect(lastData()).toEqual({ region: 'coast' }));
    });
  });

  describe('numeric choices (doc 246 rules 5-6)', () => {
    it('shows the numeric selection, never a string look-alike', () => {
      const a = renderControl(control('size'), { size: 2 });
      expect(screen.getByRole('combobox', { name: 'Size' })).toHaveValue('Medium');
      a.unmount();
      renderControl(control('size'), { size: '2' });
      expect(screen.getByRole('combobox', { name: 'Size' })).toHaveValue('');
    });

    it('writes a number from the Select', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('size'));
      await user.click(screen.getByRole('combobox', { name: 'Size' }));
      const listbox = await screen.findByRole('listbox');
      await user.click(within(listbox).getByRole('option', { name: 'Small' }));
      await waitFor(() => expect(lastData()).toEqual({ size: 1 }));
    });

    it('checks numeric data and writes a number from the Radio group', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('size', RADIOS), { size: 1 });
      expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
      await user.click(screen.getByText('Medium'));
      await waitFor(() => expect(lastData()).toEqual({ size: 2 }));
    });
  });
});
