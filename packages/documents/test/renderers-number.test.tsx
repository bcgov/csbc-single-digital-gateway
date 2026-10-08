import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const schema = {
  type: 'object',
  properties: {
    amount: {
      type: 'number',
      title: 'Amount',
      description: 'In dollars',
      minimum: 0,
      maximum: 100,
      multipleOf: 2,
    },
    age: { type: 'integer', title: 'Age' },
    size: { type: 'number', title: 'Size', oneOf: [{ const: 1, title: 'Small' }] },
  },
  required: ['age'],
};

const control = (scope: string, options: Record<string, unknown> = {}, extra = {}) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
  ...extra,
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
  const field = () => view.container.querySelector<HTMLElement>('[data-slot="number-field"]');
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, field, lastData, onChange };
}

const ctx = { rootSchema: schema, config: {} } as never;
const ranksFor = (uischema: Record<string, unknown>) =>
  defaults.renderers
    .map((r) => r.tester(uischema as never, schema as never, ctx))
    .toSorted((a, b) => b - a);

describe('number input (doc 248)', () => {
  describe('dispatch (rules 1-2)', () => {
    it('ranks the number input 1 for a number or integer, never tied', () => {
      for (const scope of ['amount', 'age']) {
        const [top, next] = ranksFor(control(scope));
        expect(top).toBe(1);
        expect(next).toBeLessThan(1);
      }
    });

    it('leaves a numeric choice to the choice renderer', () => {
      renderControl(control('size'));
      expect(document.querySelector('[data-slot="number-field"]')).toBeNull();
      expect(document.querySelector('[data-slot="choice-field"]')).not.toBeNull();
    });
  });

  describe('value (rules 3-5)', () => {
    it('shows a number, and empty for anything else without rewriting it', () => {
      const a = renderControl(control('amount'), { amount: 42 });
      expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('42');
      a.unmount();
      const b = renderControl(control('amount'), { amount: 'lots' });
      expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('');
      for (const [next] of b.onChange.mock.calls) expect(next).toEqual({ amount: 'lots' });
    });

    it('writes typed numbers as numbers, and undefined when emptied', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('amount'));
      const input = screen.getByRole('textbox', { name: 'Amount' });
      await user.type(input, '42');
      await user.tab();
      await waitFor(() => expect(lastData()).toEqual({ amount: 42 }));
      await user.clear(input);
      await user.tab();
      await waitFor(() => expect(lastData()).toEqual({}));
    });

    it('is disabled when not enabled, and renders nothing when hidden', () => {
      const disabled = renderControl(control('amount'), {}, { readonly: true });
      expect(screen.getByRole('textbox', { name: 'Amount' })).toBeDisabled();
      disabled.unmount();
      const rule = { effect: 'HIDE', condition: { scope: '#', schema: {} } };
      expect(renderControl(control('amount', {}, { rule })).field()).toBeNull();
    });
  });

  describe('layout (rule 6)', () => {
    it('stacks label, description, then the input, described by the description', () => {
      const { field } = renderControl(control('amount'));
      const order = [...field()!.children].map((c) => c.getAttribute('data-slot'));
      expect(order.slice(0, 2)).toEqual(['field-label', 'field-description']);
      expect(within(field()!).getByRole('textbox')).toHaveAccessibleDescription('In dollars');
    });

    it('marks a required field, and names an unlabelled one by its key', () => {
      const required = renderControl(control('age'));
      expect(required.field()!.querySelector('label')).toHaveTextContent(/^Age$/);
      expect(required.field()!.querySelector('[data-slot="required-marker"]')).toHaveTextContent(
        '*',
      );
      expect(screen.getByRole('textbox', { name: /Age/ })).toHaveAttribute('aria-required', 'true');
      required.unmount();
      renderControl(control('amount', {}, { label: '' }));
      expect(screen.getByRole('textbox', { name: 'amount' })).toBeInTheDocument();
    });
  });

  describe('options (rules 7-10)', () => {
    it('steps by multipleOf and clamps to maximum', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('amount'), { amount: 98 });
      await user.click(screen.getByRole('textbox', { name: 'Amount' }));
      await user.keyboard('{ArrowUp}');
      await waitFor(() => expect(lastData()).toEqual({ amount: 100 }));
      await user.keyboard('{ArrowUp}');
      await waitFor(() => expect(lastData()).toEqual({ amount: 100 }));
    });

    it('never writes a fraction for an integer', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(control('age'));
      const input = screen.getByRole('textbox', { name: /Age/ });
      await user.type(input, '41.6');
      await user.tab();
      await waitFor(() => expect(lastData()).toEqual({ age: 42 }));
    });

    it('passes a string placeholder', () => {
      renderControl(control('amount', { placeholder: 'e.g. 10' }));
      expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveAttribute(
        'placeholder',
        'e.g. 10',
      );
    });
  });
});
