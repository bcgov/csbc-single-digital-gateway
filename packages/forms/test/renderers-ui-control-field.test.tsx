import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';

// Doc 182 rule 13b (added by doc 187 rule 9b) — ControlField's opt-in horizontal chrome. The rest of the
// shared control chrome is covered by renderers-ui-controls.test.tsx.

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];

// JsonSchema is a JsonSchema4 | JsonSchema7 union whose members disagree under exactOptionalPropertyTypes
// (e.g. exclusiveMaximum), so a property spread into `properties` is cast once, as a test fixture.
const nameSchema = (property: JsonSchema = {}): JsonSchema =>
  ({
    type: 'object',
    properties: { name: { type: 'string', ...property } },
  }) as unknown as JsonSchema;

const nameControl = (options?: Record<string, unknown>) =>
  ({
    type: 'Control',
    scope: '#/properties/name',
    ...(options ? { options } : {}),
  }) as UISchemaElement;

const renderControl = (schema: JsonSchema, uischema: UISchemaElement) =>
  render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={renderers}
      cells={ui.cells}
    />,
  );

describe('ControlField orientation (rule 13b)', () => {
  it('lays a control out label-left, input-right with options.orientation "horizontal"', () => {
    const { container } = renderControl(
      nameSchema({ description: 'Shown to citizens.' }),
      nameControl({ orientation: 'horizontal' }),
    );
    const field = container.querySelector('[data-slot="field"]');
    expect(field).toHaveAttribute('data-orientation', 'horizontal');
    const content = field?.querySelector(':scope > [data-slot="field-content"]');
    expect(content?.querySelector('label')).toHaveTextContent('Name');
    expect(content).toHaveTextContent('Shown to citizens.');
    const inputBox = field?.querySelector(':scope > [data-slot="control-field-input"]');
    expect(inputBox).toHaveClass('w-24', 'shrink-0');
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(inputBox).toContainElement(input);
    expect(input).toHaveAccessibleDescription('Shown to citizens.');
  });

  it('keeps the stacked layout for any other orientation value', () => {
    for (const options of [undefined, { orientation: 'vertical' }, { orientation: true }]) {
      const { container, unmount } = renderControl(nameSchema(), nameControl(options));
      expect(container.querySelector('[data-slot="field"]')).toHaveAttribute(
        'data-orientation',
        'vertical',
      );
      expect(container.querySelector('[data-slot="control-field-input"]')).toBeNull();
      unmount();
    }
  });
});

/** The character counter rendered in `container`, if any (rule 18b). */
const counterIn = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="control-field-counter"]');

// Doc 182 rule 18b — the <n>/<max> character counter on Input and Textarea.
describe('character counter (rule 18b)', () => {
  const renderWith = (
    property: JsonSchema,
    options?: Record<string, unknown>,
    data: Record<string, unknown> = {},
  ) =>
    render(
      <JsonForms
        schema={nameSchema(property)}
        uischema={nameControl(options)}
        data={data}
        renderers={renderers}
        cells={ui.cells}
      />,
    );

  it('shows <n>/<max> on its own right-aligned line directly under an Input', () => {
    const { container } = renderWith(
      { maxLength: 80, description: 'What we call you.' },
      undefined,
      { name: 'Ada' },
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    const counter = counterIn(container);
    expect(counter).toHaveTextContent(/^3\/80$/);
    expect(counter).toHaveClass('text-right', 'text-xs', 'tabular-nums', 'text-muted-foreground');
    expect(input.nextElementSibling).toBe(counter);
    expect(counter?.nextElementSibling).toHaveTextContent('What we call you.');
  });

  it('shows 0/<max> when there is no value yet', () => {
    const { container } = renderWith({ maxLength: 80 });
    expect(counterIn(container)).toHaveTextContent(/^0\/80$/);
  });

  it('counts as the author types', async () => {
    const user = userEvent.setup();
    const { container } = renderWith({ maxLength: 20 });
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Hello');
    await waitFor(() => expect(counterIn(container)).toHaveTextContent(/^5\/20$/));
  });

  it('shows the counter directly under a Textarea', () => {
    const { container } = renderWith(
      { maxLength: 500 },
      { component: 'textarea' },
      { name: 'Hello' },
    );
    const textarea = screen.getByRole('textbox', { name: 'Name' });
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.nextElementSibling).toBe(counterIn(container));
    expect(counterIn(container)).toHaveTextContent(/^5\/500$/);
  });

  // An invalid maxLength never reaches a control through JsonForms — its Ajv rejects the schema as invalid — and
  // stringInputProps' dropping of one is covered in control-options.test.ts; the counter reads that sanitised value.
  it('shows no counter without maxLength', () => {
    const { container } = renderWith({}, undefined, { name: 'Ada' });
    expect(counterIn(container)).toBeNull();
  });

  it('never shows a counter on a NumberInput', () => {
    const { container } = render(
      <JsonForms
        schema={
          {
            type: 'object',
            properties: { amount: { type: 'number', maxLength: 5 } },
          } as unknown as JsonSchema
        }
        uischema={{ type: 'Control', scope: '#/properties/amount' } as UISchemaElement}
        data={{ amount: 12 }}
        renderers={renderers}
        cells={ui.cells}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'number-input-input');
    expect(counterIn(container)).toBeNull();
  });

  it('turns destructive once the value is longer than max', () => {
    const { container } = renderWith({ maxLength: 5 }, undefined, { name: 'Ada Lovelace' });
    const counter = counterIn(container);
    expect(counter).toHaveTextContent(/^12\/5$/);
    expect(counter).toHaveClass('text-destructive');
    expect(counter).not.toHaveClass('text-muted-foreground');
  });

  it('describes the input with the counter first, then the description and the error', () => {
    const { container } = renderWith({ maxLength: 3, description: 'Short name.' }, undefined, {
      name: 'Ada Lovelace',
    });
    const input = screen.getByRole('textbox', { name: 'Name' });
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(counterIn(container)?.id);
    expect(ids[0]).toMatch(/-counter$/);
    expect(document.getElementById(ids[1] ?? '')).toHaveTextContent('Short name.');
    expect(document.getElementById(ids[2] ?? '')).toHaveAttribute('data-slot', 'field-error');
  });

  it('sits under the input inside the input box in horizontal orientation', () => {
    const { container } = renderWith(
      { maxLength: 20 },
      { orientation: 'horizontal' },
      { name: 'x' },
    );
    const box = container.querySelector('[data-slot="control-field-input"]');
    const counter = counterIn(container);
    expect(box).toContainElement(counter);
    expect(screen.getByRole('textbox', { name: 'Name' }).nextElementSibling).toBe(counter);
    expect(counter).toHaveTextContent(/^1\/20$/);
  });
});
