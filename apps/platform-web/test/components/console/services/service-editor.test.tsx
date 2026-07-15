import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceEditor } from '@/components/console/services/service-editor';
import { JsonForms } from '@repo/react/jsonforms';

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: vi.fn(() => <div data-testid="mock-json-forms">Mocked JSONForms</div>),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('ServiceEditor', () => {
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
});
