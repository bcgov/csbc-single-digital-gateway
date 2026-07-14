import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';
import { displayRenderers } from '../src/jsonforms-renderers-display';

const schema: JsonSchema = {
  type: 'object',
  properties: { phone: { type: 'string', title: 'Phone' } },
};
const uischema = {
  type: 'VerticalLayout',
  elements: [{ type: 'Control', scope: '#/properties/phone', options: { format: 'phone' } }],
} as unknown as UISchemaElement;

describe('phone control (editable)', () => {
  it('renders the phone widget and emits an E.164 value', async () => {
    const onData = vi.fn();
    const user = userEvent.setup();
    function Form() {
      const [data, setData] = useState<Record<string, unknown>>({});
      return (
        <JsonForms
          schema={schema}
          uischema={uischema}
          data={data}
          renderers={renderers}
          cells={[]}
          onChange={({ data: next }) => {
            setData(next as Record<string, unknown>);
            onData(next);
          }}
        />
      );
    }
    render(<Form />);

    // react-phone-number-input renders a country selector + the number input.
    const input = screen.getByRole('textbox', { name: /phone/i });
    await user.click(input);
    await user.paste('+12505551234');

    await waitFor(() => {
      const last = onData.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
      expect(last?.phone).toBe('+12505551234');
    });
  });
});

describe('phone display', () => {
  it('renders a stored E.164 value in national format', () => {
    render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{ phone: '+12505551234' }}
        renderers={displayRenderers}
        cells={[]}
      />,
    );
    expect(screen.getByText(/\(250\)\s*555-1234/)).toBeInTheDocument();
  });
});
