import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefinitionPreview } from '@/components/admin/document-types/definition-preview';

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: ({ schema, uischema, data, readonly, renderers, onChange }: any) => (
    <div
      data-testid="mock-jsonforms"
      data-readonly={String(readonly)}
      data-has-uischema={String(uischema !== undefined)}
      data-has-renderers={String(renderers !== undefined)}
    >
      <span data-testid="schema-display">{JSON.stringify(schema)}</span>
      <span data-testid="data-display">{JSON.stringify(data)}</span>
      <button onClick={() => onChange?.({ data: { sampleKey: 'sampleValue' } })}>
        Trigger Change
      </button>
    </div>
  ),
}));

vi.mock('@repo/react/jsonforms-renderers-display', () => ({
  displayRenderers: [{ tester: vi.fn(), renderer: vi.fn() }],
}));

const VALID_DEFINITION = JSON.stringify({
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
    },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/title' }],
  },
});

describe('DefinitionPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Should render JsonForms in interactive mode with schema and uischema', () => {
    render(<DefinitionPreview text={VALID_DEFINITION} mode="interactive" />);

    const jsonforms = screen.getByTestId('mock-jsonforms');
    expect(jsonforms).toBeInTheDocument();
    expect(jsonforms).toHaveAttribute('data-readonly', 'false');
    expect(jsonforms).toHaveAttribute('data-has-uischema', 'true');
    expect(jsonforms).toHaveAttribute('data-has-renderers', 'false');
  });

  it('Should render JsonForms in readonly mode with displayRenderers', () => {
    render(<DefinitionPreview text={VALID_DEFINITION} mode="readonly" />);

    const jsonforms = screen.getByTestId('mock-jsonforms');
    expect(jsonforms).toHaveAttribute('data-readonly', 'true');
    expect(jsonforms).toHaveAttribute('data-has-renderers', 'true');
  });

  it('Should render without uischema when definition does not include one', () => {
    const withoutUi = JSON.stringify({
      schema: { type: 'object', properties: { count: { type: 'number' } } },
    });
    render(<DefinitionPreview text={withoutUi} mode="interactive" />);

    const jsonforms = screen.getByTestId('mock-jsonforms');
    expect(jsonforms).toHaveAttribute('data-has-uischema', 'false');
  });

  it('Should render placeholder when schema is missing or invalid', () => {
    const invalidSchema = JSON.stringify({ uischema: {} });
    render(<DefinitionPreview text={invalidSchema} mode="interactive" />);

    expect(screen.getByText('Preview unavailable for this definition shape.')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-jsonforms')).not.toBeInTheDocument();
  });

  it('Should render placeholder for non-object JSON values like primitive or null', () => {
    render(<DefinitionPreview text="123" mode="interactive" />);
    expect(screen.getByText('Preview unavailable for this definition shape.')).toBeInTheDocument();

    render(<DefinitionPreview text="null" mode="interactive" />);
    expect(
      screen.getAllByText('Preview unavailable for this definition shape.').length,
    ).toBeGreaterThan(0);
  });

  it('Should handle updates via onChange and update held data state', () => {
    render(<DefinitionPreview text={VALID_DEFINITION} mode="interactive" />);

    expect(screen.getByTestId('data-display')).toHaveTextContent('{}');

    const triggerBtn = screen.getByRole('button', { name: 'Trigger Change' });
    act(() => {
      triggerBtn.click();
    });

    expect(screen.getByTestId('data-display')).toHaveTextContent(
      JSON.stringify({ sampleKey: 'sampleValue' }),
    );
  });

  it('Should clean up debounce timer on unmount', () => {
    const { unmount } = render(<DefinitionPreview text={VALID_DEFINITION} mode="interactive" />);
    expect(() => unmount()).not.toThrow();
  });

  it('Should debounce text updates and retain last valid definition during invalid edits', () => {
    const { rerender } = render(<DefinitionPreview text={VALID_DEFINITION} mode="interactive" />);

    expect(screen.getByTestId('mock-jsonforms')).toBeInTheDocument();

    // Change text to invalid JSON
    rerender(<DefinitionPreview text="invalid json {{" mode="interactive" />);

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Last valid definition is still rendered
    expect(screen.getByTestId('mock-jsonforms')).toBeInTheDocument();
  });
});
