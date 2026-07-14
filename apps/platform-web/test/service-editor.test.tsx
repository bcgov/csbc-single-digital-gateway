import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ServiceEditor } from '@/components/console/services/service-editor';

const definition = {
  schema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', title: 'Title' },
      about: { type: 'object', title: 'About' },
      contact_methods: { type: 'array', title: 'Contact methods' },
    },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/title' },
      { type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } },
      {
        type: 'Control',
        scope: '#/properties/contact_methods',
        options: { format: 'contact-methods' },
      },
    ],
  },
};

/** Mirrors service-detail: owns formData and feeds it back, so an editor feedback loop would throw. */
function Harness({ initial = { title: 'Birth certificate' } as Record<string, unknown> }) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initial);
  return (
    <>
      <ServiceEditor definition={definition} data={formData} onChange={setFormData} />
      <pre data-testid="state">{JSON.stringify(formData)}</pre>
    </>
  );
}

describe('ServiceEditor — contact methods outside the fields card', () => {
  it('renders the contact-methods section outside the title/about card', async () => {
    const { container } = render(<Harness />);
    const titleField = await screen.findByRole('textbox', { name: /title/i }, { timeout: 10000 });
    const addButton = screen.getByRole('button', { name: /add contact method/i });

    const card = container.querySelector('.bg-card');
    expect(card).not.toBeNull();
    expect(card).toContainElement(titleField); // title lives inside the fields card
    expect(card).not.toContainElement(addButton); // contact methods live outside it
  });

  it('adds a contact method while preserving other fields (no feedback loop)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByRole('button', { name: /add contact method/i }, { timeout: 10000 });

    await user.click(screen.getByRole('button', { name: /add contact method/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /phone/i }));
    await user.type(within(dialog).getByRole('textbox', { name: /^label/i }), 'Support');
    const phoneField = within(dialog).getByRole('textbox', { name: /number|value/i });
    await user.click(phoneField);
    await user.paste('+12505551234');
    await user.click(within(dialog).getByRole('button', { name: /save|add/i }));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent ?? '{}');
      expect(state.title).toBe('Birth certificate');
      expect(state.contact_methods?.[0]).toMatchObject({ type: 'phone', value: '+12505551234' });
    });
  });
});
