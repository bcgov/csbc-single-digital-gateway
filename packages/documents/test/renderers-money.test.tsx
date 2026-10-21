import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import { plainValue } from '../src/renderers/plain/plain-value';

const schema = {
  type: 'object',
  properties: {
    price: { type: 'number', title: 'Price', description: 'Before tax' },
    fee: { type: 'number', title: 'Fee' },
    size: { type: 'number', title: 'Size', oneOf: [{ const: 1, title: 'Small' }] },
    name: { type: 'string', title: 'Name' },
  },
  required: ['fee'],
};

const MONEY = { component: 'money' };
const control = (scope: string, options: Record<string, unknown> = MONEY) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
});

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
  const group = () => view.container.querySelector<HTMLElement>('[data-slot="money-input"]');
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, group, lastData, onChange };
}

const ctx = { rootSchema: schema, config: {} } as never;
const ranksFor = (uischema: Record<string, unknown>) =>
  defaults.renderers
    .map((r) => r.tester(uischema as never, schema.properties.price as never, ctx))
    .toSorted((a, b) => b - a);

describe('money control (doc 286)', () => {
  describe('dispatch (rule 1)', () => {
    it('ranks a plain number with component "money" at 2, above the Number input, with no tie', () => {
      const [top, next] = ranksFor(control('price'));
      expect(top).toBe(2);
      expect(next).toBeLessThan(2);
      const [plain] = ranksFor(control('price', {}));
      expect(plain).toBe(1);
    });

    it('does not match a numeric choice or a string with component "money"', () => {
      const choice = renderControl(control('size'));
      expect(choice.group()).toBeNull();
      expect(document.querySelector('[data-slot="choice-field"]')).not.toBeNull();
      choice.unmount();
      const text = renderControl(control('name'));
      expect(text.group()).toBeNull();
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    });
  });

  describe('rendering (rules 4-6)', () => {
    it('draws an input group with the currency icon addon before the input', () => {
      const { group } = renderControl(control('price'));
      // Base UI also renders its hidden native number input in the group; only slotted children are layout.
      const slots = [...group()!.children]
        .map((c) => c.getAttribute('data-slot'))
        .filter((slot) => slot !== null);
      expect(slots).toEqual(['money-currency', 'number-input']);
      const addon = group()!.querySelector('[data-slot="money-currency"]')!;
      expect(addon.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(within(group()!).getByRole('textbox')).toHaveAttribute(
        'data-slot',
        'input-group-control',
      );
    });

    it('names the input by its label and describes it with the spoken currency first, then the description', () => {
      renderControl(control('price'));
      const input = screen.getByRole('textbox', { name: 'Price' });
      expect(input).toHaveAccessibleDescription('Canadian dollars Before tax');
      const [first] = input.getAttribute('aria-describedby')!.split(' ');
      expect(document.getElementById(first!)).toHaveTextContent('Canadian dollars');
    });

    it('shows a stored 5 as 5.00', () => {
      renderControl(control('price'), { price: 5 });
      expect(screen.getByRole('textbox', { name: 'Price' })).toHaveValue('5.00');
    });

    it('refuses a third decimal while typing, so 5.678 is never shown or written', async () => {
      const user = userEvent.setup();
      const { lastData, onChange } = renderControl(control('price'));
      const input = screen.getByRole('textbox', { name: 'Price' });
      await user.type(input, '5.678');
      expect(input).toHaveValue('5.67');
      await waitFor(() => expect(lastData()).toEqual({ price: 5.67 }));
      for (const [next] of onChange.mock.calls) expect(next['price']).not.toBe(5.678);
      await user.tab();
      expect(input).toHaveValue('5.67');
    });

    it('shows a stored 5.678 rounded to 5.68', () => {
      renderControl(control('price'), { price: 5.678 });
      expect(screen.getByRole('textbox', { name: 'Price' })).toHaveValue('5.68');
    });

    it('writes undefined, never null or 0, when emptied', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('price'), { price: 12 });
      const input = screen.getByRole('textbox', { name: 'Price' });
      await user.clear(input);
      await user.tab();
      await waitFor(() => expect(lastData()).toEqual({}));
    });

    it('marks required with a red asterisk and hides the label with options.hideLabel', () => {
      const required = renderControl(control('fee'));
      const label = required.container.querySelector('label')!;
      expect(label).toHaveTextContent(/^Fee$/);
      expect(required.container.querySelector('[data-slot="required-marker"]')).toHaveClass(
        'text-destructive',
      );
      expect(screen.getByRole('textbox', { name: /Fee/ })).toHaveAttribute('aria-required', 'true');
      required.unmount();
      const hidden = renderControl(control('price', { ...MONEY, hideLabel: true }));
      expect(hidden.container.querySelector('label')).toHaveClass('sr-only');
      expect(screen.getByRole('textbox', { name: 'Price' })).toBeInTheDocument();
    });

    it('disables the input when the control is disabled', () => {
      const { group } = renderControl(control('price'), {}, { readonly: true });
      expect(screen.getByRole('textbox', { name: 'Price' })).toBeDisabled();
      expect(group()).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('read-back (rule 7)', () => {
    it('plainValue formats a money answer as $1,234.50', () => {
      expect(plainValue({ type: 'number' }, control('price'), 1234.5)).toEqual({
        kind: 'text',
        text: '$1,234.50',
      });
      expect(
        plainValue({ type: 'number' }, control('price', { ...MONEY, currency: 'XYZ' }), 3),
      ).toEqual({ kind: 'text', text: '$3.00' });
    });

    it('plainValue leaves a plain number unchanged', () => {
      expect(plainValue({ type: 'number' }, control('price', {}), 1234.5)).toEqual({
        kind: 'text',
        text: '1,234.5',
      });
    });
  });
});
