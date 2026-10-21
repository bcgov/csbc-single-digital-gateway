import type { JsonFormsCore, JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import { CheckboxControlRenderer } from '../src/renderers/ui/checkbox-renderer';
import { SwitchControlRenderer } from '../src/renderers/ui/switch-renderer';
import { MUST_BE_CHECKED_MESSAGE } from '../src/renderers/ui/boolean-field';

// Doc 188 rules 4, 6-7, 17-20 — the Checkbox and Switch control renderers in renderers/ui.

type Data = Record<string, unknown>;

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];

function control(
  options?: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): UISchemaElement {
  return {
    type: 'Control',
    scope: '#/properties/agree',
    ...(options ? { options } : {}),
    ...extra,
  } as UISchemaElement;
}

// Extra keys are a plain record: spreading the JsonSchema 4 | 7 union into a literal fails exactOptionalPropertyTypes.
const schemaWith = (agree: Record<string, unknown> = {}, required?: string[]) =>
  ({
    type: 'object',
    properties: {
      agree: { type: 'boolean', title: 'Agree', ...agree },
      hidden: { type: 'boolean' },
    },
    ...(required ? { required } : {}),
  }) as JsonSchema;

/** `@jsonforms/react` debounces `onChange` by 10ms, so assert on `data()` inside `waitFor`. */
function renderForm(
  schema: JsonSchema,
  uischema: UISchemaElement,
  data: Data = {},
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

/** The renderer of the single top-ranked entry, or `undefined` when nothing matches or ranks tie. */
function topRenderer(uischema: UISchemaElement, schema: JsonSchema) {
  const context = { rootSchema: schema, config: {} };
  const ranks = ui.controlRenderers.map((entry) => entry.tester(uischema, schema, context));
  const top = Math.max(...ranks);
  const winners = ui.controlRenderers.filter((_entry, index) => top > 0 && ranks[index] === top);
  return winners.length === 1 ? winners[0]?.renderer : undefined;
}

const follows = (first: Node, second: Node | null | undefined) =>
  second !== null &&
  second !== undefined &&
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('boolean dispatch (rules 4, 6)', () => {
  it('dispatches a boolean control to Checkbox with component absent, "checkbox" or unknown', () => {
    for (const options of [undefined, { component: 'checkbox' }, { component: 'textarea' }]) {
      expect(topRenderer(control(options), schemaWith()), JSON.stringify(options)).toBe(
        CheckboxControlRenderer,
      );
    }
  });

  it('dispatches a boolean control with component "switch" to Switch alone', () => {
    expect(topRenderer(control({ component: 'switch' }), schemaWith())).toBe(SwitchControlRenderer);
  });
});

describe('Checkbox control (rules 17-18, 20)', () => {
  it('renders a checkbox named by its label, ahead of the label, in a horizontal field', () => {
    renderForm(schemaWith(), control());
    const box = screen.getByRole('checkbox', { name: 'Agree' });
    expect(box).toHaveAttribute('data-slot', 'checkbox');
    expect(box).toHaveAttribute('aria-checked', 'false');

    const field = box.closest('[data-slot="field"]');
    expect(field).toHaveAttribute('data-orientation', 'horizontal');
    const label = field?.querySelector('label');
    expect(label).toHaveTextContent('Agree');
    expect(follows(box, label)).toBe(true);
  });

  it('shows true data as checked', () => {
    renderForm(schemaWith(), control(), { agree: true });
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toHaveAttribute('aria-checked', 'true');
  });

  it('writes true and then false as it is toggled', async () => {
    const form = renderForm(schemaWith(), control());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agree' }));
    await waitFor(() => expect(form.data()['agree']).toBe(true));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agree' }));
    await waitFor(() => expect(form.data()['agree']).toBe(false));
  });

  it('toggles once from a click anywhere on the field, its description or its label (rule 20b)', async () => {
    const form = renderForm(schemaWith({ description: 'Tick to agree.' }), control());
    const field = screen
      .getByRole('checkbox', { name: 'Agree' })
      .closest<HTMLElement>('[data-slot="field"]');
    expect(field).toHaveClass('cursor-pointer');

    fireEvent.click(field as HTMLElement);
    await waitFor(() => expect(form.data()['agree']).toBe(true));
    fireEvent.click(screen.getByText('Tick to agree.'));
    await waitFor(() => expect(form.data()['agree']).toBe(false));
    // The label toggles natively through the hidden input; the field must not toggle it a second time.
    fireEvent.click(screen.getByText('Agree'));
    await waitFor(() => expect(form.data()['agree']).toBe(true));
  });

  it('ignores clicks on a read-only field', async () => {
    const form = renderForm(schemaWith(), control(), {}, true);
    const field = screen
      .getByRole('checkbox', { name: 'Agree' })
      .closest<HTMLElement>('[data-slot="field"]');
    expect(field).not.toHaveClass('cursor-pointer');
    fireEvent.click(field as HTMLElement);
    // Past the 10ms onChange debounce, nothing was written.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(form.data()).not.toHaveProperty('agree');
  });

  it('marks a required checkbox with an asterisk', () => {
    renderForm(schemaWith({}, ['agree']), control(), { agree: true });
    expect(screen.getByRole('checkbox', { name: 'Agree*' })).toBeInTheDocument();
  });

  it('describes the checkbox with the schema description', () => {
    renderForm(schemaWith({ description: 'Tick to agree.' }), control());
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toHaveAccessibleDescription(
      'Tick to agree.',
    );
  });

  it('shows validation errors, sets aria-invalid and describes the checkbox with the error', () => {
    renderForm(schemaWith({ const: true }), control(), { agree: false });
    // Doc 188 rule 23: `const: true` is "must be checked", so the label carries the required asterisk.
    const box = screen.getByRole('checkbox', { name: 'Agree*' });
    const alert = screen.getByRole('alert');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription(alert.textContent ?? '');
  });

  it('says "must be checked" rather than Ajv\'s "must be equal to constant" (rule 23)', () => {
    renderForm(schemaWith({ const: true }), control(), { agree: false });
    expect(screen.getByRole('alert')).toHaveTextContent(MUST_BE_CHECKED_MESSAGE);
    expect(screen.getByRole('alert')).not.toHaveTextContent('constant');
  });

  it('says the same for an UNTOUCHED box, which writes nothing at all (rule 23)', () => {
    // `const` is only evaluated for a property that is PRESENT, so Must be checked also marks it required
    // (doc 187 rule 29) — without that, a citizen who never touched the box would pass validation.
    renderForm(schemaWith({ const: true }, ['agree']), control(), {});
    expect(screen.getByRole('alert')).toHaveTextContent(MUST_BE_CHECKED_MESSAGE);
    expect(screen.getByRole('checkbox', { name: 'Agree*' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('is satisfied once the box is ticked', () => {
    renderForm(schemaWith({ const: true }, ['agree']), control(), { agree: true });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("keeps Ajv's own message for any OTHER boolean error, and adds no asterisk", () => {
    // `const: false` is not the must-be-checked case, so nothing is rewritten.
    renderForm(schemaWith({ const: false }), control(), { agree: true });
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent(MUST_BE_CHECKED_MESSAGE);
  });

  it('is disabled when the form is read-only', () => {
    renderForm(schemaWith(), control(), {}, true);
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toHaveAttribute('data-disabled');
  });

  it('renders nothing when a rule hides it', () => {
    const hide = {
      rule: {
        effect: 'HIDE',
        condition: { scope: '#/properties/hidden', schema: { const: true } },
      },
    };
    renderForm(schemaWith(), control(undefined, hide), { hidden: true });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('Switch control (rules 17, 19-20)', () => {
  it('renders a default-size switch named by its label, after the label, in a horizontal field', () => {
    renderForm(schemaWith(), control({ component: 'switch' }));
    const toggle = screen.getByRole('switch', { name: 'Agree' });
    expect(toggle).toHaveAttribute('data-slot', 'switch');
    expect(toggle).toHaveAttribute('data-size', 'default');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    const field = toggle.closest('[data-slot="field"]');
    expect(field).toHaveAttribute('data-orientation', 'horizontal');
    const label = field?.querySelector('label');
    expect(label).toHaveTextContent('Agree');
    expect(follows(label as Node, toggle)).toBe(true);
  });

  it('renders size "sm" only for options.size exactly "sm"', () => {
    for (const [size, expected] of [
      ['sm', 'sm'],
      ['large', 'default'],
      [1, 'default'],
    ] as const) {
      const { unmount } = renderForm(schemaWith(), control({ component: 'switch', size }));
      expect(screen.getByRole('switch', { name: 'Agree' }), String(size)).toHaveAttribute(
        'data-size',
        expected,
      );
      unmount();
    }
  });

  it('writes true and then false as it is toggled', async () => {
    const form = renderForm(schemaWith(), control({ component: 'switch' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Agree' }));
    await waitFor(() => expect(form.data()['agree']).toBe(true));
    fireEvent.click(screen.getByRole('switch', { name: 'Agree' }));
    await waitFor(() => expect(form.data()['agree']).toBe(false));
  });

  it('toggles once from a click on its description or anywhere on the field (rule 20b)', async () => {
    const form = renderForm(
      schemaWith({ description: 'Flip to agree.' }),
      control({ component: 'switch' }),
    );
    fireEvent.click(screen.getByText('Flip to agree.'));
    await waitFor(() => expect(form.data()['agree']).toBe(true));
    const field = screen
      .getByRole('switch', { name: 'Agree' })
      .closest<HTMLElement>('[data-slot="field"]');
    fireEvent.click(field as HTMLElement);
    await waitFor(() => expect(form.data()['agree']).toBe(false));
  });

  it('describes the switch with the schema description', () => {
    renderForm(schemaWith({ description: 'Flip to agree.' }), control({ component: 'switch' }));
    expect(screen.getByRole('switch', { name: 'Agree' })).toHaveAccessibleDescription(
      'Flip to agree.',
    );
  });

  it('is disabled when the form is read-only', () => {
    renderForm(schemaWith(), control({ component: 'switch' }), {}, true);
    expect(screen.getByRole('switch', { name: 'Agree' })).toHaveAttribute('data-disabled');
  });
});
