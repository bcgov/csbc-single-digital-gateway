import {
  NOT_APPLICABLE,
  type JsonFormsCore,
  type JsonSchema,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';

// Doc 182 rules 8-22 — Input / Textarea / NumberInput control renderers in renderers/ui.

type Data = Record<string, unknown>;

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];

function control(
  scope: string,
  options?: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): UISchemaElement {
  return { type: 'Control', scope, ...(options ? { options } : {}), ...extra } as UISchemaElement;
}

function objectSchema(properties: Record<string, JsonSchema>, required?: string[]): JsonSchema {
  return {
    type: 'object',
    properties: { ...properties, hidden: { type: 'boolean' } },
    ...(required ? { required } : {}),
  };
}

interface RenderOptions {
  data?: Data;
  readonly?: boolean;
}

/**
 * Renders one uischema through renderers/ui and exposes the latest emitted form data.
 * `@jsonforms/react` debounces `onChange` by 10ms, so assert on `data()` inside `waitFor`.
 */
function renderForm(
  schema: JsonSchema,
  uischema: UISchemaElement,
  { data = {}, readonly = false }: RenderOptions = {},
) {
  let latest: Data = data;
  const onChange = ({ data: next }: Pick<JsonFormsCore, 'data'>) => {
    latest = next as Data;
  };
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={ui.cells}
      readonly={readonly}
      onChange={onChange}
    />,
  );
  return { ...view, data: () => latest };
}

const textSchema = (property: JsonSchema = {}, required?: string[]) =>
  objectSchema({ name: { type: 'string', ...property } }, required);
const numberSchema = (property: JsonSchema = {}) =>
  objectSchema({ amount: { type: 'number', ...property } });

describe('control dispatch', () => {
  const rootSchema: JsonSchema = {
    type: 'object',
    properties: {
      text: { type: 'string' },
      amount: { type: 'number' },
      count: { type: 'integer' },
    },
  };
  const context = { rootSchema, config: {} };
  const [inputEntry, textareaEntry, numberEntry] = ui.controlRenderers;

  /** Indices of the entries sharing the highest applicable rank. */
  const topEntries = (uischema: UISchemaElement) => {
    const ranks = ui.controlRenderers.map((entry) => entry.tester(uischema, rootSchema, context));
    const max = Math.max(...ranks);
    return ranks.flatMap((rank, index) => (rank === max && rank > 0 ? [index] : []));
  };

  it('registers Input, Textarea and NumberInput first, ahead of the doc 188 and 205 controls', () => {
    expect(ui.controlRenderers).toHaveLength(9);
    expect(inputEntry?.tester(control('#/properties/text'), rootSchema, context)).toBe(1);
    expect(
      textareaEntry?.tester(
        control('#/properties/text', { component: 'textarea' }),
        rootSchema,
        context,
      ),
    ).toBe(2);
    expect(numberEntry?.tester(control('#/properties/amount'), rootSchema, context)).toBe(1);
  });

  it('dispatches a string control to Input with component absent, "input" or unknown', () => {
    for (const options of [undefined, { component: 'input' }, { component: 'fancy' }]) {
      expect(topEntries(control('#/properties/text', options)), JSON.stringify(options)).toEqual([
        0,
      ]);
    }
    expect(textareaEntry?.tester(control('#/properties/text'), rootSchema, context)).toBe(
      NOT_APPLICABLE,
    );
  });

  it('dispatches a string control with component "textarea" to Textarea alone', () => {
    expect(topEntries(control('#/properties/text', { component: 'textarea' }))).toEqual([1]);
  });

  it('dispatches a number control to NumberInput with or without component "number"', () => {
    expect(topEntries(control('#/properties/amount'))).toEqual([2]);
    expect(topEntries(control('#/properties/amount', { component: 'number' }))).toEqual([2]);
  });

  it('lets the schema type win over options.component', () => {
    expect(topEntries(control('#/properties/amount', { component: 'textarea' }))).toEqual([2]);
    expect(topEntries(control('#/properties/text', { component: 'number' }))).toEqual([0]);
  });

  it('dispatches an integer control to the number input (doc 204 rule 17)', () => {
    // Amends doc 182 rule 10: `type: 'integer'` is what "Allow decimals: off" writes, so it must render —
    // and as the SAME control, since multipleOf and options.decimals already decide step and fraction digits.
    // Guard: with no control renderers registered the next assertion would pass vacuously.
    expect(ui.controlRenderers).toHaveLength(9);
    // Index 2 is the NumberInput entry — the same one a `type: 'number'` control reaches.
    expect(topEntries(control('#/properties/count'))).toEqual([2]);
  });
});

describe('Input control', () => {
  it('renders a labelled <input data-slot="input"> showing the current value', () => {
    renderForm(textSchema(), control('#/properties/name'), { data: { name: 'Ada' } });
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).toHaveValue('Ada');
  });

  it('writes typed text to the data and removes the property when cleared', async () => {
    const user = userEvent.setup();
    const form = renderForm(textSchema(), control('#/properties/name'));
    const input = screen.getByRole('textbox', { name: 'Name' });

    await user.type(input, 'Ada');
    await waitFor(() => expect(form.data()['name']).toBe('Ada'));

    await user.clear(input);
    await waitFor(() => expect(form.data()).not.toHaveProperty('name'));
  });

  it('applies options.placeholder and schema maxLength', () => {
    renderForm(
      textSchema({ maxLength: 80 }),
      control('#/properties/name', { placeholder: 'Jane' }),
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveAttribute('placeholder', 'Jane');
    expect(input).toHaveAttribute('maxlength', '80');
  });

  it('drops a non-string placeholder', () => {
    renderForm(textSchema(), control('#/properties/name', { placeholder: 42 }));
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('placeholder');
  });
});

describe('Input control — mask (doc 204 rules 6-10)', () => {
  const PHONE = '(999) 999-9999';
  const phone = (input: HTMLElement, digits: string) =>
    fireEvent.input(input, { target: { value: digits } });

  it('masks what the citizen types and stores it as shown by default', async () => {
    const form = renderForm(textSchema(), control('#/properties/name', { mask: PHONE }));
    const input = screen.getByRole('textbox', { name: 'Name' });

    phone(input, '2505550123');

    expect(input).toHaveValue('(250) 555-0123');
    await waitFor(() => expect(form.data()['name']).toBe('(250) 555-0123'));
  });

  it('stores the raw characters when maskUnmasked is authored', async () => {
    const form = renderForm(
      textSchema(),
      control('#/properties/name', { mask: PHONE, maskUnmasked: true }),
    );
    const input = screen.getByRole('textbox', { name: 'Name' });

    phone(input, '2505550123');

    // Shown masked either way — only what is STORED differs.
    expect(input).toHaveValue('(250) 555-0123');
    await waitFor(() => expect(form.data()['name']).toBe('2505550123'));
  });

  it('leaves an unmasked field exactly as it was', async () => {
    const user = userEvent.setup();
    const form = renderForm(textSchema(), control('#/properties/name'));
    const input = screen.getByRole('textbox', { name: 'Name' });

    await user.type(input, '2505550123');

    expect(input).toHaveValue('2505550123');
    await waitFor(() => expect(form.data()['name']).toBe('2505550123'));
  });

  it('never masks a Textarea, even when a mask is authored (rule 8)', () => {
    renderForm(textSchema(), control('#/properties/name', { component: 'textarea', mask: PHONE }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.tagName).toBe('TEXTAREA');

    fireEvent.input(input, { target: { value: '2505550123' } });

    expect(input).toHaveValue('2505550123');
  });

  it('ignores a non-string mask, leaving the field unmasked', () => {
    renderForm(textSchema(), control('#/properties/name', { mask: 42 }));
    const input = screen.getByRole('textbox', { name: 'Name' });

    fireEvent.input(input, { target: { value: '2505550123' } });

    expect(input).toHaveValue('2505550123');
  });

  it('counts the STORED value in the counter, never a mask-stripped one (rule 10)', async () => {
    // A hand-authored document can still carry both; the counter must agree with what Ajv measures.
    const form = renderForm(
      textSchema({ maxLength: 20 }),
      control('#/properties/name', { mask: PHONE }),
    );
    const input = screen.getByRole('textbox', { name: 'Name' });

    phone(input, '2505550123');

    await waitFor(() => expect(form.data()['name']).toBe('(250) 555-0123'));
    expect(screen.getByText('14/20')).toBeInTheDocument();
  });
});

describe('Textarea control', () => {
  it('renders a labelled <textarea> with placeholder and maxLength', async () => {
    const user = userEvent.setup();
    const form = renderForm(
      textSchema({ maxLength: 500 }),
      control('#/properties/name', { component: 'textarea', placeholder: 'Tell us' }),
    );
    const textarea = screen.getByRole('textbox', { name: 'Name' });

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('placeholder', 'Tell us');
    expect(textarea).toHaveAttribute('maxlength', '500');

    await user.type(textarea, 'Hi');
    await waitFor(() => expect(form.data()['name']).toBe('Hi'));
  });
});

describe('NumberInput control', () => {
  it('renders a labelled number-input-input for a number schema', () => {
    renderForm(numberSchema(), control('#/properties/amount'), { data: { amount: 7 } });
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(input).toHaveAttribute('data-slot', 'number-input-input');
    expect(input).toHaveValue('7');
  });

  it('writes typed numbers as numbers and removes the property when cleared', async () => {
    const user = userEvent.setup();
    const form = renderForm(numberSchema(), control('#/properties/amount'));
    const input = screen.getByRole('textbox', { name: 'Amount' });

    await user.type(input, '42');
    await user.tab();
    await waitFor(() => expect(form.data()['amount']).toBe(42));

    await user.clear(input);
    await user.tab();
    await waitFor(() => expect(form.data()).not.toHaveProperty('amount'));
  });

  it('steps by options.step over schema multipleOf and clamps to schema maximum', async () => {
    const user = userEvent.setup();
    const form = renderForm(
      numberSchema({ maximum: 100, multipleOf: 2 }),
      control('#/properties/amount', { step: 5 }),
      { data: { amount: 98 } },
    );
    await user.click(screen.getByRole('textbox', { name: 'Amount' }));
    await user.keyboard('{ArrowUp}');
    await waitFor(() => expect(form.data()['amount']).toBe(100));
  });

  it('steps by schema multipleOf when options.step is absent', async () => {
    const user = userEvent.setup();
    const form = renderForm(numberSchema({ multipleOf: 2 }), control('#/properties/amount'), {
      data: { amount: 0 },
    });
    await user.click(screen.getByRole('textbox', { name: 'Amount' }));
    await user.keyboard('{ArrowUp}');
    await waitFor(() => expect(form.data()['amount']).toBe(2));
  });

  it('formats the displayed value with options.format and options.locale', () => {
    renderForm(
      numberSchema(),
      control('#/properties/amount', {
        format: { style: 'currency', currency: 'CAD' },
        locale: 'en-CA',
      }),
      { data: { amount: 1234.5 } },
    );
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('$1,234.50');
  });

  it('still renders when options.format is rejected by Intl', () => {
    renderForm(numberSchema(), control('#/properties/amount', { format: { style: 'currency' } }), {
      data: { amount: 5 },
    });
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('5');
  });
});

describe('shared control chrome', () => {
  it('marks a required control with an asterisk in its label', () => {
    renderForm(textSchema({}, ['name']), control('#/properties/name'), { data: { name: 'Ada' } });
    expect(screen.getByRole('textbox', { name: 'Name*' })).toBeInTheDocument();
  });

  it('renders no <label> when the uischema sets label: false', () => {
    const { container } = renderForm(
      textSchema(),
      control('#/properties/name', undefined, { label: false }),
    );
    expect(container.querySelector('label')).toBeNull();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows the schema description and wires it as the accessible description', () => {
    renderForm(textSchema({ description: 'Your full name' }), control('#/properties/name'));
    const input = screen.getByRole('textbox', { name: 'Name' });

    expect(input).toHaveAccessibleDescription('Your full name');
    expect(document.getElementById(`${input.id}-description`)).toHaveTextContent('Your full name');
  });

  it('shows validation errors, sets aria-invalid and describes the input with the error', () => {
    renderForm(textSchema({ maxLength: 3 }), control('#/properties/name'), {
      data: { name: 'abcd' },
    });
    const input = screen.getByRole('textbox', { name: 'Name' });

    expect(screen.getByRole('alert')).toHaveTextContent(/3 characters/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/3 characters/);
    expect(document.getElementById(`${input.id}-error`)).toHaveTextContent(/3 characters/);
  });

  it('sets neither aria-describedby nor aria-invalid when there is no description or error', () => {
    renderForm(textSchema(), control('#/properties/name'));
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('disables every control when the form is readonly', () => {
    const schema = objectSchema({
      name: { type: 'string' },
      about: { type: 'string' },
      amount: { type: 'number' },
    });
    const elements = [
      control('#/properties/name'),
      control('#/properties/about', { component: 'textarea' }),
      control('#/properties/amount'),
    ];
    // renderers/ui has no VerticalLayout, so each control renders on its own.
    for (const element of elements) {
      const { unmount } = renderForm(schema, element, { readonly: true });
      expect(screen.getByRole('textbox')).toBeDisabled();
      unmount();
    }
  });

  it('renders nothing when a rule hides the control', () => {
    const hide = {
      rule: {
        effect: 'HIDE',
        condition: { scope: '#/properties/hidden', schema: { const: true } },
      },
    };
    const { unmount } = renderForm(textSchema(), control('#/properties/name', undefined, hide), {
      data: { hidden: true },
    });
    expect(screen.queryByRole('textbox')).toBeNull();
    unmount();

    renderForm(textSchema(), control('#/properties/name', undefined, hide), {
      data: { hidden: false },
    });
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });
});
