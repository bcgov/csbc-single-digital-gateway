import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const schema = {
  type: 'object',
  properties: {
    resident: { type: 'boolean', title: 'BC resident', description: 'From the schema' },
    plain: { type: 'boolean' },
  },
};

const control = (options: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  type: 'Control',
  scope: '#/properties/resident',
  options,
  ...extra,
});

/** JSONForms debounces onChange, so a write is read once it has settled. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

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
  const row = () => view.container.querySelector<HTMLElement>('[data-slot="boolean-field"]')!;
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  /** The row's visible parts: Base UI renders the control's hidden <input> as its sibling. */
  const parts = () => [...row().children].filter((c) => c.tagName !== 'INPUT');
  return { ...view, row, parts, lastData, onChange };
}

const ctx = { rootSchema: schema, config: {} } as never;
const ranksFor = (uischema: Record<string, unknown>) =>
  defaults.renderers
    .map((r) => r.tester(uischema as never, schema as never, ctx))
    .toSorted((a, b) => b - a);

describe('boolean controls (doc 237)', () => {
  describe('dispatch (rules 1-2)', () => {
    it('ranks the Checkbox 1 and the Switch 2, never tied', () => {
      expect(ranksFor(control())[0]).toBe(1);
      const [top, next] = ranksFor(control({ component: 'switch' }));
      expect(top).toBe(2);
      expect(next).toBe(1);
    });

    it('renders a Checkbox unless options.component is switch', () => {
      for (const component of [undefined, 'toggle', 'checkbox']) {
        const { row, unmount } = renderControl(
          control(component === undefined ? {} : { component }),
        );
        expect(row()).toHaveAttribute('data-component', 'checkbox');
        expect(within(row()).getByRole('checkbox')).toBeInTheDocument();
        unmount();
      }
      const { row } = renderControl(control({ component: 'switch' }));
      expect(row()).toHaveAttribute('data-component', 'switch');
      expect(within(row()).getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('shared row (rules 3-10)', () => {
    it('is checked only for data === true', () => {
      const { row } = renderControl(control(), { resident: true });
      expect(within(row()).getByRole('checkbox')).toBeChecked();
    });

    it('treats undefined and non-boolean data as unchecked', () => {
      const a = renderControl(control());
      expect(within(a.row()).getByRole('checkbox')).not.toBeChecked();
      a.unmount();
      const b = renderControl(control(), { resident: 'yes' });
      expect(within(b.row()).getByRole('checkbox')).not.toBeChecked();
    });

    it('toggles from a click anywhere on the row, writing true then false', async () => {
      const { row, lastData } = renderControl(control());
      fireEvent.click(row());
      await waitFor(() => expect(lastData()).toEqual({ resident: true }));
      expect(within(row()).getByRole('checkbox')).toBeChecked();
      fireEvent.click(row().querySelector('[data-slot="field-description"]')!);
      await waitFor(() => expect(lastData()).toEqual({ resident: false }));
      expect(within(row()).getByRole('checkbox')).not.toBeChecked();
    });

    it('toggles to checked from a click on the control or the label (native toggles the row skips)', async () => {
      for (const target of ['control', 'label'] as const) {
        const { row, lastData, unmount } = renderControl(control());
        const el =
          target === 'control'
            ? within(row()).getByRole('checkbox')
            : row().querySelector('label')!;
        fireEvent.click(el);
        // eslint-disable-next-line no-await-in-loop -- each case renders, settles and unmounts before the next
        await settle();
        // Both write from the same render's `checked`, so a double toggle is not observable here; the row's skip
        // (rule 4) avoids the redundant write. This pins that both native paths still toggle.
        expect(lastData(), target).toEqual({ resident: true });
        expect(within(row()).getByRole('checkbox'), target).toBeChecked();
        unmount();
      }
    });

    it('toggles a Switch from anywhere on its row too', async () => {
      const { row, lastData } = renderControl(control({ component: 'switch' }), { resident: true });
      fireEvent.click(row().querySelector('[data-slot="field-content"]')!);
      await waitFor(() => expect(lastData()).toEqual({ resident: false }));
      expect(within(row()).getByRole('switch')).not.toBeChecked();
    });

    it('labels the control with the computed label, tied by htmlFor', () => {
      const { row, unmount } = renderControl(control());
      expect(within(row()).getByRole('checkbox', { name: 'BC resident' })).toBeInTheDocument();
      unmount();
      const custom = renderControl(control({}, { label: 'Lives in BC' }));
      expect(
        within(custom.row()).getByRole('checkbox', { name: 'Lives in BC' }),
      ).toBeInTheDocument();
    });

    it('describes it from options.description, else the schema description', () => {
      const own = renderControl(control({ description: 'From the uischema' }));
      expect(own.row()).toHaveTextContent('From the uischema');
      expect(own.row()).not.toHaveTextContent('From the schema');
      expect(within(own.row()).getByRole('checkbox')).toHaveAccessibleDescription(
        'From the uischema',
      );
      own.unmount();
      const fallback = renderControl(control({ description: '   ' }));
      expect(within(fallback.row()).getByRole('checkbox')).toHaveAccessibleDescription(
        'From the schema',
      );
      fallback.unmount();
      const none = renderControl({ type: 'Control', scope: '#/properties/plain' });
      expect(none.row().querySelector('[data-slot="field-description"]')).toBeNull();
    });

    it('never toggles when disabled', async () => {
      const { row, lastData } = renderControl(control(), {}, { readonly: true });
      expect(row()).toHaveAttribute('data-disabled');
      fireEvent.click(row());
      fireEvent.click(row().querySelector('label')!);
      await settle();
      expect(lastData()?.['resident']).toBeUndefined();
      expect(within(row()).getByRole('checkbox')).not.toBeChecked();
      expect(within(row()).getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders nothing when hidden', () => {
      const shown = renderControl(control());
      expect(shown.container.querySelector('[data-slot="boolean-field"]')).not.toBeNull();
      shown.unmount();
      const rule = { effect: 'HIDE', condition: { scope: '#', schema: {} } };
      const { container } = renderControl(control({}, { rule }));
      expect(container.querySelector('[data-slot="boolean-field"]')).toBeNull();
    });
  });

  describe('layouts (rules 11-12)', () => {
    it('puts the checkbox before its text', () => {
      const { parts } = renderControl(control());
      const [first, second] = parts();
      expect(first).toHaveAttribute('data-slot', 'checkbox');
      expect(second).toHaveAttribute('data-slot', 'field-content');
      expect(screen.getByText('BC resident')).toBeInTheDocument();
    });

    it('puts the switch after its text', () => {
      const { parts } = renderControl(control({ component: 'switch' }));
      expect(parts()[0]).toHaveAttribute('data-slot', 'field-content');
      expect(parts().at(-1)).toHaveAttribute('data-slot', 'switch');
    });
  });
});

describe('a must-be-checked boolean (doc 253 rule 5)', () => {
  it('still renders as a plain Checkbox', async () => {
    const mustCheck = { type: 'object', properties: { agree: { type: 'boolean', const: true } } };
    const ranks = defaults.renderers
      .map((r) =>
        r.tester(
          { type: 'Control', scope: '#/properties/agree' } as never,
          mustCheck as never,
          { rootSchema: mustCheck, config: {} } as never,
        ),
      )
      .toSorted((a, b) => b - a);
    expect(ranks[0]).toBe(1);
    const { container } = render(
      <JsonForms
        schema={mustCheck}
        uischema={{ type: 'Control', scope: '#/properties/agree', label: 'Agree' } as never}
        data={{ agree: true }}
        renderers={defaults.renderers}
        cells={defaults.cells}
      />,
    );
    expect(container.querySelector('[data-slot="boolean-field"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
  });
});
