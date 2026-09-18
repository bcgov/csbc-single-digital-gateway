import type { JsonFormsCore, JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import { ComboboxControlRenderer } from '../src/renderers/ui/combobox-renderer';
import { InputControlRenderer } from '../src/renderers/ui/input-renderer';
import { NumberInputControlRenderer } from '../src/renderers/ui/number-input-renderer';
import { RadioGroupControlRenderer } from '../src/renderers/ui/radio-group-renderer';

// Doc 188 rules 4-16 — the Combobox and RadioGroup control renderers for oneOf (const/title) schemas.

type Data = Record<string, unknown>;

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];

const PLANS = [
  { const: 'basic', title: 'Basic' },
  { const: 'pro', title: 'Pro' },
  { const: 'team', title: 'Team' },
];

// Extra keys are a plain record: spreading the JsonSchema 4 | 7 union into a literal fails exactOptionalPropertyTypes.
const schemaWith = (plan: Record<string, unknown> = {}, required?: string[]) =>
  ({
    type: 'object',
    properties: {
      plan: { type: 'string', title: 'Plan', oneOf: PLANS, ...plan },
      seats: {
        type: 'number',
        title: 'Seats',
        oneOf: [
          { const: 1, title: 'One' },
          { const: 5, title: 'Five' },
        ],
      },
      count: { type: 'integer', oneOf: [{ const: 1 }] },
      hidden: { type: 'boolean' },
    },
    ...(required ? { required } : {}),
  }) as JsonSchema;

function control(
  key: string,
  options?: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): UISchemaElement {
  return {
    type: 'Control',
    scope: `#/properties/${key}`,
    ...(options ? { options } : {}),
    ...extra,
  } as UISchemaElement;
}

const RADIOS = { component: 'radio-group' };

/** `@jsonforms/react` debounces `onChange` by 10ms, so assert on `data()` inside `waitFor`. */
function renderForm(
  uischema: UISchemaElement,
  {
    data = {},
    schema = schemaWith(),
    readonly = false,
  }: { data?: Data; schema?: JsonSchema; readonly?: boolean } = {},
) {
  let latest: Data = data;
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={ui.cells}
      readonly={readonly}
      onChange={({ data: next }: Pick<JsonFormsCore, 'data'>) => {
        latest = next as Data;
      }}
    />,
  );
  return { ...view, data: () => latest };
}

/** The renderer of the single top-ranked entry, or `undefined` when nothing matches or ranks tie. */
function topRenderer(uischema: UISchemaElement, schema: JsonSchema = schemaWith()) {
  const context = { rootSchema: schema, config: {} };
  const ranks = ui.controlRenderers.map((entry) => entry.tester(uischema, schema, context));
  const top = Math.max(...ranks);
  const winners = ui.controlRenderers.filter((_entry, index) => top > 0 && ranks[index] === top);
  return winners.length === 1 ? winners[0]?.renderer : undefined;
}

describe('choice dispatch (rules 4-6)', () => {
  it('dispatches a string or number choice to Combobox with component absent, "combobox" or unknown', () => {
    for (const options of [
      undefined,
      { component: 'combobox' },
      { component: 'textarea' },
      { component: 'fancy' },
    ]) {
      const label = JSON.stringify(options);
      expect(topRenderer(control('plan', options)), label).toBe(ComboboxControlRenderer);
      expect(topRenderer(control('seats', options)), label).toBe(ComboboxControlRenderer);
    }
  });

  it('dispatches a choice with component "radio-group" to RadioGroup alone', () => {
    expect(topRenderer(control('plan', RADIOS))).toBe(RadioGroupControlRenderer);
    expect(topRenderer(control('seats', RADIOS))).toBe(RadioGroupControlRenderer);
  });

  it('falls back to the plain control for a oneOf that is not a choice schema', () => {
    expect(topRenderer(control('plan'), schemaWith({ oneOf: [] }))).toBe(InputControlRenderer);
    const mixed = {
      type: 'object',
      properties: { seats: { type: 'number', oneOf: [{ const: 1 }, { const: 'two' }] } },
    } as JsonSchema;
    expect(topRenderer(control('seats'), mixed)).toBe(NumberInputControlRenderer);
    // `count` is `{ type: 'integer', oneOf: [{ const: 1 }] }` — a choice list now (doc 204 rule 18b).
    expect(topRenderer(control('count'))).toBe(ComboboxControlRenderer);
  });
});

describe('Combobox control (rules 9-13)', () => {
  it('renders a combobox input named by its label, showing the selected title', () => {
    renderForm(control('plan'), { data: { plan: 'pro' } });
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('Pro');
  });

  it('lists every option by title and writes the picked const', async () => {
    const user = userEvent.setup();
    const form = renderForm(control('plan'));
    await user.click(screen.getByRole('combobox', { name: 'Plan' }));
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Basic', 'Pro', 'Team']);

    await user.click(within(listbox).getByRole('option', { name: 'Team' }));
    await waitFor(() => expect(form.data()['plan']).toBe('team'));
  });

  it('filters the options by label as the author types, without writing the typed text', async () => {
    const user = userEvent.setup();
    const form = renderForm(control('plan'));
    const input = screen.getByRole('combobox', { name: 'Plan' });
    await user.click(input);
    await user.type(input, 'Pr');
    const listbox = await screen.findByRole('listbox');
    await waitFor(() =>
      expect(
        within(listbox)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Pro']),
    );
    expect(form.data()).not.toHaveProperty('plan');
  });

  it('writes a number const for a number choice', async () => {
    const user = userEvent.setup();
    const form = renderForm(control('seats'));
    await user.click(screen.getByRole('combobox', { name: 'Seats' }));
    await user.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'Five' }),
    );
    await waitFor(() => expect(form.data()['seats']).toBe(5));
  });

  it('removes the property when cleared', async () => {
    const user = userEvent.setup();
    const form = renderForm(control('plan'), { data: { plan: 'pro' } });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(form.data()).not.toHaveProperty('plan'));
  });

  it('applies a string options.placeholder and drops any other', () => {
    const { unmount } = renderForm(control('plan', { placeholder: 'Choose a plan' }));
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveAttribute(
      'placeholder',
      'Choose a plan',
    );
    unmount();
    renderForm(control('plan', { placeholder: 3 }));
    expect(screen.getByRole('combobox', { name: 'Plan' })).not.toHaveAttribute('placeholder');
  });

  it('shows an empty input for data that is not one of the options', () => {
    renderForm(control('plan'), { data: { plan: 'gold' } });
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('');
  });

  it('describes the input, and flags errors with aria-invalid', () => {
    renderForm(control('plan'), {
      data: { plan: 'gold' },
      schema: schemaWith({ description: 'Billed monthly.' }),
    });
    const input = screen.getByRole('combobox', { name: 'Plan' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Billed monthly\./);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('is disabled when the form is read-only', () => {
    renderForm(control('plan'), { readonly: true });
    expect(screen.getByRole('combobox', { name: 'Plan' })).toBeDisabled();
  });
});

describe('RadioGroup control (rules 14-16)', () => {
  it('renders a radiogroup named by its label with one radio per option named by its title', () => {
    renderForm(control('plan', RADIOS));
    const group = screen.getByRole('radiogroup', { name: 'Plan' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-checked')),
    ).toEqual(['false', 'false', 'false']);
    for (const title of ['Basic', 'Pro', 'Team']) {
      expect(within(group).getByRole('radio', { name: title })).toBeInTheDocument();
    }
  });

  it('checks the radio whose const matches the data', () => {
    renderForm(control('plan', RADIOS), { data: { plan: 'pro' } });
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Basic' })).toHaveAttribute('aria-checked', 'false');
  });

  it('writes the picked const — a string, or a number for a number choice', async () => {
    const user = userEvent.setup();
    const form = renderForm(control('plan', RADIOS));
    await user.click(screen.getByRole('radio', { name: 'Team' }));
    await waitFor(() => expect(form.data()['plan']).toBe('team'));
    form.unmount();

    const seats = renderForm(control('seats', RADIOS));
    await user.click(screen.getByRole('radio', { name: 'Five' }));
    await waitFor(() => expect(seats.data()['seats']).toBe(5));
  });

  it('selects an option when its title is clicked', async () => {
    const user = userEvent.setup();
    const form = renderForm(control('plan', RADIOS));
    await user.click(screen.getByText('Pro'));
    await waitFor(() => expect(form.data()['plan']).toBe('pro'));
  });

  it('checks nothing for data that is not one of the options, and ignores options.placeholder', () => {
    const { container } = renderForm(control('plan', { ...RADIOS, placeholder: 'Choose' }), {
      data: { plan: 'gold' },
    });
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-checked', 'false');
    }
    expect(container.querySelector('[placeholder]')).toBeNull();
  });

  it('describes the group with the schema description', () => {
    renderForm(control('plan', RADIOS), { schema: schemaWith({ description: 'Billed monthly.' }) });
    expect(screen.getByRole('radiogroup', { name: 'Plan' })).toHaveAccessibleDescription(
      'Billed monthly.',
    );
  });

  it('marks a required group with an asterisk in its name', () => {
    renderForm(control('plan', RADIOS), {
      data: { plan: 'pro' },
      schema: schemaWith({}, ['plan']),
    });
    expect(screen.getByRole('radiogroup', { name: 'Plan*' })).toBeInTheDocument();
  });

  it('disables every radio when the form is read-only', () => {
    renderForm(control('plan', RADIOS), { readonly: true });
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('data-disabled');
    }
  });

  it('renders nothing when a rule hides it', () => {
    const hide = {
      rule: {
        effect: 'HIDE',
        condition: { scope: '#/properties/hidden', schema: { const: true } },
      },
    };
    renderForm(control('plan', RADIOS, hide), { data: { hidden: true } });
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
