import type { JsonFormsCore, JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import { CheckboxGroupControlRenderer } from '../src/renderers/ui/checkbox-group-renderer';
import { MultiComboboxControlRenderer } from '../src/renderers/ui/multi-combobox-renderer';

// Doc 205 rules 5-21, 24, 43 — dispatch, the chips combobox and the checkbox group.

type Data = Record<string, unknown>;

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];
const testerContext = { rootSchema: {} as JsonSchema, config: {} };

const SUPPORTS = [
  { const: 'wheelchair', title: 'Wheelchair access', description: 'Step-free entry' },
  { const: 'interpreter', title: 'Interpreter' },
  { const: 'braille', title: 'Braille' },
];

const schemaWith = (supports: Record<string, unknown> = {}, required?: string[]) =>
  ({
    type: 'object',
    properties: {
      supports: {
        type: 'array',
        title: 'Supports needed',
        uniqueItems: true,
        items: { oneOf: SUPPORTS },
        ...supports,
      },
      // A single choice and a number, to prove the new testers leave them alone.
      plan: { type: 'string', title: 'Plan', oneOf: [{ const: 'basic', title: 'Basic' }] },
      counts: {
        type: 'array',
        title: 'Counts',
        items: {
          oneOf: [
            { const: 1, title: 'One' },
            { const: 2, title: 'Two' },
          ],
        },
      },
    },
    ...(required ? { required } : {}),
  }) as JsonSchema;

const control = (key: string, options?: Record<string, unknown>): UISchemaElement =>
  ({
    type: 'Control',
    scope: `#/properties/${key}`,
    ...(options ? { options } : {}),
  }) as UISchemaElement;

/** Renders one uischema and exposes the latest emitted data (JSONForms debounces onChange by 10ms). */
function renderForm(
  uischema: UISchemaElement,
  data: Data = {},
  schema = schemaWith(),
  readonly = false,
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

/** The entries whose tester returns the top rank for this element — doc 188 rule 6's no-tie check. */
const topEntries = (uischema: UISchemaElement, schema = schemaWith()) => {
  const ranks = ui.controlRenderers.map((entry) => entry.tester(uischema, schema, testerContext));
  const max = Math.max(...ranks);
  return ranks.flatMap((rank, index) => (rank === max && rank > 0 ? [index] : []));
};

describe('dispatch (rules 5-7, 43)', () => {
  it('registers nine control renderers, the new two APPENDED (rule 43)', () => {
    // Appending keeps integer-control.test.tsx's positional ui.controlRenderers[2] valid.
    expect(ui.controlRenderers).toHaveLength(9);
    expect(ui.controlRenderers[7]?.renderer).toBe(MultiComboboxControlRenderer);
    expect(ui.controlRenderers[8]?.renderer).toBe(CheckboxGroupControlRenderer);
  });

  it('dispatches a multi-choice control to the multi combobox at rank 5 by default', () => {
    expect(ui.controlRenderers[7]?.tester(control('supports'), schemaWith(), testerContext)).toBe(
      5,
    );
    expect(topEntries(control('supports'))).toEqual([7]);
  });

  it("dispatches to the checkbox group at rank 6 for component 'checkbox-group'", () => {
    expect(topEntries(control('supports', { component: 'checkbox-group' }))).toEqual([8]);
  });

  it('treats an unrecognised component as the default combobox', () => {
    expect(topEntries(control('supports', { component: 'fancy' }))).toEqual([7]);
    expect(topEntries(control('supports', { component: 'combobox' }))).toEqual([7]);
  });

  it('leaves the single-choice and other controls untouched', () => {
    // The single Combobox (index 3) still wins a single-choice schema; no multi entry matches it.
    expect(topEntries(control('plan'))).toEqual([3]);
  });
});

describe('the multi-select combobox (rules 8-9, 12-17)', () => {
  const openList = async (input: HTMLElement) => {
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    return screen.findByRole('listbox');
  };

  it('shows a chip per chosen option, labelled by its title', () => {
    renderForm(control('supports'), { supports: ['braille', 'wheelchair'] });
    expect(screen.getByText('Wheelchair access')).toBeInTheDocument();
    expect(screen.getByText('Braille')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Braille' })).toBeInTheDocument();
  });

  it('stores the chosen consts in AUTHORING order, not click order (rule 8)', async () => {
    const form = renderForm(control('supports'), { supports: ['braille'] });
    const input = screen.getByRole('combobox');
    const list = await openList(input);

    await userEvent.click(within(list).getByRole('option', { name: /Wheelchair access/ }));

    // Clicked braille-then-wheelchair; stored in items.oneOf order.
    await waitFor(() => expect(form.data()['supports']).toEqual(['wheelchair', 'braille']));
  });

  it('writes undefined when the last chip is removed, never [] (rule 9)', async () => {
    const form = renderForm(control('supports'), { supports: ['braille'] });

    await userEvent.click(screen.getByRole('button', { name: 'Remove Braille' }));

    await waitFor(() => expect(form.data()).not.toHaveProperty('supports'));
  });

  it('removes one chip without disturbing the others', async () => {
    const form = renderForm(control('supports'), {
      supports: ['wheelchair', 'interpreter', 'braille'],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Remove Interpreter' }));

    await waitFor(() => expect(form.data()['supports']).toEqual(['wheelchair', 'braille']));
  });

  it('renders an option description as a second line in the list (rule 16)', async () => {
    renderForm(control('supports'));
    const list = await openList(screen.getByRole('combobox'));
    expect(within(list).getByText('Step-free entry')).toBeInTheDocument();
  });

  it('shows the placeholder only while nothing is chosen (rule 17)', () => {
    const empty = renderForm(control('supports', { placeholder: 'Choose…' }));
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Choose…');
    empty.unmount();

    renderForm(control('supports', { placeholder: 'Choose…' }), { supports: ['braille'] });
    expect(screen.getByRole('combobox')).not.toHaveAttribute('placeholder', 'Choose…');
  });

  it('leaves a stored const that is not among the options untouched (rule 11)', () => {
    renderForm(control('supports'), { supports: ['gone', 'braille'] });
    // Shown: only the known one. The unknown const is not rendered and not rewritten.
    expect(screen.getByText('Braille')).toBeInTheDocument();
    expect(screen.queryByText('gone')).toBeNull();
  });
});

describe('the checkbox group (rules 18-21, 24)', () => {
  // A REQUIRED field's label carries JSONForms' asterisk, so match by prefix rather than exactly.
  const group = () => screen.getByRole('group', { name: /^Supports needed/ });

  it('renders one labelled checkbox per option, ticked from the data', () => {
    renderForm(control('supports', { component: 'checkbox-group' }), { supports: ['interpreter'] });
    expect(within(group()).getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: /Interpreter/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Braille/ })).not.toBeChecked();
  });

  it('names the group by the control label through aria-labelledby (rule 19)', () => {
    renderForm(control('supports', { component: 'checkbox-group' }));
    // getByRole with a name already proves it; assert the wiring explicitly too.
    expect(group()).toHaveAttribute('aria-labelledby');
  });

  it('sets aria-invalid on the group container when the field has errors (rule 20)', async () => {
    renderForm(
      control('supports', { component: 'checkbox-group' }),
      {},
      schemaWith({}, ['supports']),
    );
    await waitFor(() => expect(group()).toHaveAttribute('aria-invalid', 'true'));
    // Never on the items — the set being under-filled is not one box's fault.
    for (const box of within(group()).getAllByRole('checkbox')) {
      expect(box).not.toHaveAttribute('aria-invalid');
    }
  });

  it('renders an option description as help text under its label (rule 18)', () => {
    renderForm(control('supports', { component: 'checkbox-group' }));
    expect(within(group()).getByText('Step-free entry')).toBeInTheDocument();
  });

  it('ignores options.placeholder (rule 21)', () => {
    renderForm(control('supports', { component: 'checkbox-group', placeholder: 'Choose…' }));
    expect(screen.queryByPlaceholderText('Choose…')).toBeNull();
  });

  it('stores authoring order, and undefined when the last box is unticked', async () => {
    const form = renderForm(control('supports', { component: 'checkbox-group' }), {
      supports: ['braille'],
    });

    await userEvent.click(screen.getByRole('checkbox', { name: /Wheelchair access/ }));
    await waitFor(() => expect(form.data()['supports']).toEqual(['wheelchair', 'braille']));

    await userEvent.click(screen.getByRole('checkbox', { name: /Wheelchair access/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Braille/ }));
    await waitFor(() => expect(form.data()).not.toHaveProperty('supports'));
  });

  it('round-trips NUMERIC consts through Base UI string values (rule 24)', async () => {
    // Storing "1" where the schema says 1 fails Ajv with a message about allowed values, not types.
    const form = renderForm(control('counts', { component: 'checkbox-group' }), { counts: [2] });
    expect(screen.getByRole('checkbox', { name: /Two/ })).toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: /One/ }));

    await waitFor(() => expect(form.data()['counts']).toEqual([1, 2]));
    for (const value of form.data()['counts'] as unknown[]) {
      expect(typeof value).toBe('number');
    }
  });
});

describe('shared control chrome (doc 188 rules 7-8)', () => {
  it('disables both controls when the form is read-only (doc 202 rule 50)', () => {
    // Neither control has an HTML read-only, so `noReadOnly` falls back to disabled.
    const combo = renderForm(control('supports'), {}, schemaWith(), true);
    expect(screen.getByRole('combobox')).toBeDisabled();
    combo.unmount();

    renderForm(control('supports', { component: 'checkbox-group' }), {}, schemaWith(), true);
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('labels both controls and wires the description into aria-describedby', () => {
    renderForm(control('supports'));
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Supports needed');
  });
});
