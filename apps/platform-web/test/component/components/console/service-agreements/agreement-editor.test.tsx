import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgreementEditor } from '@/components/console/service-agreements/agreement-editor';
import { JsonForms } from '@repo/react/jsonforms';

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: vi.fn(({ onChange, data }: any) => (
    <div data-testid="mock-json-forms">
      <button
        data-testid="mock-change-btn"
        onClick={() => onChange({ data: { ...data, title: 'Updated Title' } })}
      >
        Change
      </button>
    </div>
  )),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('AgreementEditor Component Test Suite', () => {
  const definition = {
    schema: { type: 'object', properties: { title: { type: 'string' } } },
    uischema: { type: 'VerticalLayout', elements: [] },
  };

  it('renders JsonForms with correct props and allows changes when not readonly', () => {
    const onChange = vi.fn();
    const data = { title: 'Old Title' };

    render(
      <AgreementEditor definition={definition} data={data} onChange={onChange} readonly={false} />,
    );

    // Verify JsonForms was rendered with the correct props
    const call1 = vi.mocked(JsonForms).mock.calls[0];
    expect(call1 ? call1[0] : null).toEqual(
      expect.objectContaining({
        schema: definition.schema,
        uischema: definition.uischema,
        data: data,
        readonly: false,
      }),
    );

    // Simulate change
    const changeBtn = screen.getByTestId('mock-change-btn');
    changeBtn.click();

    expect(onChange).toHaveBeenCalledWith({ title: 'Updated Title' });
  });

  it('does not trigger onChange when readonly is true', () => {
    const onChange = vi.fn();
    const data = { title: 'Old Title' };

    render(
      <AgreementEditor definition={definition} data={data} onChange={onChange} readonly={true} />,
    );

    const call2 = vi.mocked(JsonForms).mock.calls[0];
    expect(call2 ? call2[0] : null).toEqual(
      expect.objectContaining({
        readonly: true,
      }),
    );

    // Simulate change
    const changeBtn = screen.getByTestId('mock-change-btn');
    changeBtn.click();

    expect(onChange).not.toHaveBeenCalled();
  });
});
