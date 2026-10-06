import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, city: { type: 'string', title: 'City' } },
  required: ['city'],
};
const FORM = {
  type: 'Form',
  elements: [
    {
      type: 'Tabs',
      elements: [
        {
          type: 'VerticalLayout',
          id: 'a',
          label: 'Person',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        },
        {
          type: 'VerticalLayout',
          id: 'b',
          label: 'Address',
          elements: [{ type: 'Control', scope: '#/properties/city' }],
        },
      ],
    },
  ],
};

describe('Tabs — default renderer (doc 272 rules 2-3)', () => {
  it('shows the first tab, switches tabs, and dots the tab with an error', async () => {
    const user = userEvent.setup();
    render(
      <JsonForms
        schema={SCHEMA}
        uischema={FORM as never}
        data={{}}
        renderers={defaults.renderers}
        cells={defaults.cells}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Person' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    // City is required and empty: its tab carries the dot; Person has no error.
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Address, has errors' })).toBeInTheDocument(),
    );
    expect(
      screen
        .getByRole('tab', { name: 'Address, has errors' })
        .querySelector('[data-slot="tab-error-dot"]'),
    ).not.toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Address, has errors' }));
    const panel = screen.getByRole('tabpanel');
    await user.type(within(panel).getByRole('textbox', { name: 'City' }), 'Victoria');
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Address' })).toBeInTheDocument());
  });

  it('always draws the Line tab list, ignoring any authored options.variant (doc 272 rule 9)', () => {
    const authored = {
      ...FORM,
      elements: [{ ...FORM.elements[0]!, options: { variant: 'default' } }],
    };
    render(
      <JsonForms
        schema={SCHEMA}
        uischema={authored as never}
        data={{}}
        renderers={defaults.renderers}
        cells={defaults.cells}
      />,
    );
    expect(screen.getByRole('tablist')).toHaveAttribute('data-variant', 'line');
  });

  it('renders nothing for a Tabs with no tabs', () => {
    const { container } = render(
      <JsonForms
        schema={SCHEMA}
        uischema={{ type: 'Form', elements: [{ type: 'Tabs', elements: [] }] } as never}
        data={{}}
        renderers={defaults.renderers}
        cells={defaults.cells}
      />,
    );
    expect(container.querySelector('[data-slot="tabs-layout"]')).toBeNull();
  });
});
