import type { JsonFormsCore, JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as inspector from '../src/renderers-studio-inspector';
import * as ui from '../src/renderers-ui';

// Doc 187 rules 1-7 — the @repo/forms/renderers/studio-inspector renderer set.

type Data = Record<string, unknown>;

const CATEGORIES = ['cells', 'controlRenderers', 'displayRenderers', 'layoutRenderers'] as const;

const renderers = () => [
  ...inspector.controlRenderers,
  ...inspector.displayRenderers,
  ...inspector.layoutRenderers,
];

const el = (element: object) => element as UISchemaElement;

const schema: JsonSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', title: 'Label' },
    count: { type: 'number', title: 'Count' },
    on: { type: 'boolean', title: 'Required', description: 'Authors must fill it in.' },
    pick: {
      type: 'string',
      title: 'Pick',
      oneOf: [
        { const: 'a', title: 'A' },
        { const: 'b', title: 'B' },
      ],
    },
  },
};

function renderForm(uischema: UISchemaElement, data: Data = {}, readonly = false) {
  const changes: Data[] = [];
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers()}
      cells={inspector.cells}
      readonly={readonly}
      onChange={({ data: next }: Pick<JsonFormsCore, 'data'>) => changes.push(next as Data)}
    />,
  );
  return { ...view, changes, last: () => changes.at(-1) };
}

// Doc 188 rule 22: inspector booleans ask renderers/ui for a small Switch.
const switchControl = el({
  type: 'Control',
  scope: '#/properties/on',
  options: { component: 'switch', size: 'sm' },
});

describe('renderer set (rules 1-3, 7)', () => {
  it('exports the four RendererSet arrays, with no cells or display renderers', () => {
    for (const category of CATEGORIES)
      expect(Array.isArray(inspector[category]), category).toBe(true);
    expect(inspector.cells).toEqual([]);
    expect(inspector.displayRenderers).toEqual([]);
    expect(inspector.controlRenderers).toHaveLength(ui.controlRenderers.length);
    expect(inspector.layoutRenderers).toHaveLength(2);
  });

  it('reuses exactly the renderers/ui control entries, by reference and in order (doc 188 rule 21)', () => {
    expect(ui.controlRenderers).toHaveLength(9);
    ui.controlRenderers.forEach((entry, index) => {
      expect(inspector.controlRenderers[index]).toBe(entry);
    });
  });

  it.each([
    ['a string control', el({ type: 'Control', scope: '#/properties/text' })],
    [
      'a textarea control',
      el({ type: 'Control', scope: '#/properties/text', options: { component: 'textarea' } }),
    ],
    ['a number control', el({ type: 'Control', scope: '#/properties/count' })],
    ['a switch control', switchControl],
    ['a checkbox control', el({ type: 'Control', scope: '#/properties/on' })],
    ['a combobox control', el({ type: 'Control', scope: '#/properties/pick' })],
    [
      'a radio-group control',
      el({ type: 'Control', scope: '#/properties/pick', options: { component: 'radio-group' } }),
    ],
    ['a Group', el({ type: 'Group', label: 'General', elements: [] })],
    ['a VerticalLayout', el({ type: 'VerticalLayout', elements: [] })],
  ])('dispatches %s to exactly one top-ranked entry', (_name, uischema) => {
    const ranks = renderers().map(({ tester }) =>
      tester(uischema, schema, { rootSchema: schema, config: {} }),
    );
    const top = Math.max(...ranks);
    expect(top).toBeGreaterThan(0);
    expect(ranks.filter((rank) => rank === top)).toHaveLength(1);
  });

  it('has no renderer for a Grid or HorizontalLayout — nothing in the set uses gridstack', () => {
    for (const type of ['Grid', 'HorizontalLayout']) {
      const ranks = renderers().map(({ tester }) =>
        tester(el({ type, elements: [] }), schema, { rootSchema: schema, config: {} }),
      );
      expect(Math.max(...ranks), type).toBeLessThanOrEqual(0);
    }
  });
});

describe('Switch through options.component "switch" (doc 188 rules 19, 22)', () => {
  it('renders a boolean control as a labelled switch beside its description', () => {
    renderForm(switchControl);
    const toggle = screen.getByRole('switch', { name: 'Required' });
    expect(toggle).toHaveAttribute('data-slot', 'switch');
    // Compact density (rule 6c).
    expect(toggle).toHaveAttribute('data-size', 'sm');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle.closest('[data-slot="field"]')).toHaveAttribute('data-orientation', 'horizontal');

    const describedBy = toggle.getAttribute('aria-describedby') ?? '';
    expect(describedBy).not.toBe('');
    expect(document.getElementById(describedBy)).toHaveTextContent('Authors must fill it in.');
  });

  it('shows true data as checked', () => {
    renderForm(switchControl, { on: true });
    expect(screen.getByRole('switch', { name: 'Required' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('writes true and then false as it is toggled', async () => {
    const { last } = renderForm(switchControl);
    fireEvent.click(screen.getByRole('switch', { name: 'Required' }));
    await waitFor(() => expect(last()).toEqual({ on: true }));
    fireEvent.click(screen.getByRole('switch', { name: 'Required' }));
    await waitFor(() => expect(last()).toEqual({ on: false }));
  });

  it('is disabled when the form is read-only', () => {
    renderForm(switchControl, {}, true);
    expect(screen.getByRole('switch', { name: 'Required' })).toHaveAttribute('data-disabled');
  });
});

describe('Section and Stack layouts (rules 5-6)', () => {
  const section = el({
    type: 'Group',
    label: 'General',
    elements: [el({ type: 'Control', scope: '#/properties/text' })],
  });

  it('renders a Group as a fieldset with its label as the legend and its children inside', () => {
    const { container } = renderForm(el({ type: 'VerticalLayout', elements: [section] }));
    const fieldset = container.querySelector('[data-slot="inspector-section"]');
    expect(fieldset?.tagName).toBe('FIELDSET');
    expect(fieldset?.querySelector(':scope > legend')).toHaveTextContent('General');
    // Compact density (rule 6c): tight gaps and a small uppercase muted legend.
    expect(fieldset).toHaveClass('gap-2');
    expect(fieldset?.querySelector(':scope > legend')).toHaveAttribute('data-variant', 'label');
    expect(fieldset?.querySelector(':scope > legend')).toHaveClass(
      'uppercase',
      'text-muted-foreground',
    );
    expect(fieldset?.querySelector('[data-slot="field-group"]')).toHaveClass('gap-2');
    expect(
      within(fieldset as HTMLElement).getByRole('textbox', { name: 'Label' }),
    ).toBeInTheDocument();
  });

  it('renders no legend for a Group without a label', () => {
    const { container } = renderForm(el({ type: 'Group', elements: [] }));
    const fieldset = container.querySelector('[data-slot="inspector-section"]');
    expect(fieldset).not.toBeNull();
    expect(fieldset?.querySelector('legend')).toBeNull();
  });

  it('renders nothing for a hidden Group', () => {
    const hidden = el({
      ...section,
      rule: { effect: 'HIDE', condition: { scope: '#/properties/on', schema: { const: true } } },
    });
    const { container } = renderForm(hidden, { on: true });
    expect(container.querySelector('[data-slot="inspector-section"]')).toBeNull();
  });

  it('renders a VerticalLayout as a plain column of its children in order, without gridstack', () => {
    const { container } = renderForm(
      el({
        type: 'VerticalLayout',
        elements: [
          el({ type: 'Group', label: 'General', elements: [] }),
          el({ type: 'Group', label: 'Validation', elements: [] }),
        ],
      }),
    );
    const stack = container.querySelector('[data-slot="inspector-stack"]');
    expect(stack).toHaveClass('flex', 'flex-col', 'gap-4');
    expect(
      Array.from(stack?.querySelectorAll('[data-slot="inspector-section"] > legend') ?? []).map(
        (legend) => legend.textContent,
      ),
    ).toEqual(['General', 'Validation']);
    expect(container.querySelector('.grid-stack')).toBeNull();
  });

  // Rule 6c: descendant variants on the stack shrink the SHARED renderers/ui controls only inside the inspector.
  it('makes every field below the stack compact without changing the ui controls themselves', () => {
    const { container } = renderForm(
      el({
        type: 'VerticalLayout',
        elements: [el({ type: 'Control', scope: '#/properties/text' })],
      }),
    );
    const stack = container.querySelector('[data-slot="inspector-stack"]');
    expect(stack).toHaveClass(
      'text-xs',
      '[&_[data-slot=field]]:gap-1',
      '[&_[data-slot=field-label]]:text-xs',
      '[&_[data-slot=field-description]]:text-xs',
      '[&_[data-slot=input]]:h-7',
      '[&_[data-slot=input]]:text-xs',
      '[&_[data-slot=number-input-input]]:h-7',
      '[&_[data-slot=number-input-input]]:text-xs',
      '[&_[data-slot=textarea]]:min-h-12',
      '[&_[data-slot=textarea]]:text-xs',
      // Doc 188 rule 23.
      '[&_[data-slot=radio-group]]:gap-2',
      '[&_[data-slot=input-group]]:h-7',
      '[&_[data-slot=input-group-control]]:text-xs',
    );
    const input = within(stack as HTMLElement).getByRole('textbox', { name: 'Label' });
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).not.toHaveClass('h-7');
  });
});

describe('horizontal number fields (rule 9b)', () => {
  it('lays a number field with options.orientation "horizontal" out label-left, input-right', () => {
    renderForm(
      el({
        type: 'VerticalLayout',
        elements: [
          el({
            type: 'Control',
            scope: '#/properties/count',
            options: { orientation: 'horizontal' },
          }),
        ],
      }),
    );
    const input = screen.getByRole('textbox', { name: 'Count' });
    expect(input).toHaveAttribute('data-slot', 'number-input-input');
    const field = input.closest('[data-slot="field"]');
    expect(field).toHaveAttribute('data-orientation', 'horizontal');
    expect(field?.querySelector(':scope > [data-slot="field-content"] label')).toHaveTextContent(
      'Count',
    );
    expect(input.closest('[data-slot="control-field-input"]')).toHaveClass('w-24', 'shrink-0');
  });
});
