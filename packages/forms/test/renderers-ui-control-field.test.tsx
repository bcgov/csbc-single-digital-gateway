import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
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
