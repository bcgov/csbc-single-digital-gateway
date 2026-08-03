import { JsonForms } from '@repo/react/jsonforms';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceEditor } from '@/components/console/services/service-editor';

const state = vi.hoisted(() => ({ isIntegrationTest: false }));

vi.mock('@repo/react/jsonforms', async (importOriginal) => {
  const actual = await importOriginal<any>();
  const MockJsonForms = vi.fn((props: any) => {
    if (state.isIntegrationTest) {
      return <actual.JsonForms {...props} />;
    }
    return <div data-testid="mock-json-forms">Mocked JSONForms</div>;
  });
  return {
    ...actual,
    JsonForms: MockJsonForms,
  };
});

afterEach(() => {
  vi.clearAllMocks();
  state.isIntegrationTest = false;
});

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

describe('ServiceEditor Component Test Suite', () => {
  it('renders JsonForms with correct props', () => {
    const mockDefinition = {
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      uischema: { type: 'VerticalLayout', elements: [] },
    };
    const mockData = { name: 'Riverton' };
    const mockOnChange = vi.fn();

    render(
      <ServiceEditor
        definition={mockDefinition}
        data={mockData}
        onChange={mockOnChange}
        readonly={false}
      />,
    );

    expect(screen.getByTestId('mock-json-forms')).toBeInTheDocument();

    expect(JsonForms).toHaveBeenCalledTimes(1);
    const props = vi.mocked(JsonForms).mock.calls[0]![0];
    expect(props.schema).toEqual(mockDefinition.schema);
    expect(props.uischema).toEqual(mockDefinition.uischema);
    expect(props.data).toEqual(mockData);
    expect(props.readonly).toBe(false);
  });

  it('calls onChange when JsonForms calls onChange and readonly is false', () => {
    const mockDefinition = {
      schema: { type: 'object' },
      uischema: { type: 'VerticalLayout' },
    };
    const mockOnChange = vi.fn();

    render(
      <ServiceEditor
        definition={mockDefinition}
        data={{}}
        onChange={mockOnChange}
        readonly={false}
      />,
    );

    // Get the onChange prop passed to JsonForms and invoke it
    const jsonFormsProps = vi.mocked(JsonForms).mock.calls[0]![0];
    jsonFormsProps.onChange!({ data: { title: 'New Title' } } as any);

    expect(mockOnChange).toHaveBeenCalledWith({ title: 'New Title' });
  });

  it('does not call onChange when JsonForms calls onChange and readonly is true', () => {
    const mockDefinition = {
      schema: { type: 'object' },
      uischema: { type: 'VerticalLayout' },
    };
    const mockOnChange = vi.fn();

    render(
      <ServiceEditor
        definition={mockDefinition}
        data={{}}
        onChange={mockOnChange}
        readonly={true}
      />,
    );

    const jsonFormsProps = vi.mocked(JsonForms).mock.calls[0]![0];
    jsonFormsProps.onChange!({ data: { title: 'New Title' } } as any);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  describe('Integration tests', () => {
    beforeEach(() => {
      state.isIntegrationTest = true;
    });

    afterEach(() => {
      state.isIntegrationTest = false;
    });

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
});
