import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Preview from '@/components/form-builder/preview';

// Mock FormRunner from shared repo library
vi.mock('@repo/react/form-runner', () => ({
  FormRunner: ({ kind, definition, data, onChange }: any) => (
    <div data-testid="mock-form-runner">
      <span>Kind: {kind}</span>
      <span>Definition: {JSON.stringify(definition)}</span>
      <span>Data: {JSON.stringify(data)}</span>
      <button onClick={() => onChange({ name: 'Lewis' })}>Update Data</button>
    </div>
  ),
}));

describe('Preview Component Test Suite', () => {
  const mockDefinition = {
    schema: {
      type: 'object',
      properties: {
        fullname: { type: 'string', title: 'Full Name' },
      },
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [],
    },
  };

  it('renders FormRunner with definition and empty default data state', () => {
    render(<Preview definition={mockDefinition as any} />);

    expect(screen.getByTestId('mock-form-runner')).toBeInTheDocument();
    expect(screen.getByText('Kind: basic-form')).toBeInTheDocument();
    expect(screen.getByText('Data: {}')).toBeInTheDocument();
    expect(screen.getByText(/Full Name/)).toBeInTheDocument();
  });

  it('renders the form title and description as a header', () => {
    render(
      <Preview
        definition={
          {
            schema: {
              type: 'object',
              title: 'My Form',
              description: 'Fill this out',
              properties: {},
            },
            uischema: { type: 'VerticalLayout', elements: [] },
          } as any
        }
      />,
    );
    expect(screen.getByRole('heading', { name: 'My Form' })).toBeInTheDocument();
    expect(screen.getByText('Fill this out')).toBeInTheDocument();
  });

  it('renders only title when description is omitted or empty', () => {
    render(
      <Preview
        definition={
          {
            schema: {
              type: 'object',
              title: 'Only Title Form',
              description: '',
              properties: {},
            },
            uischema: { type: 'VerticalLayout', elements: [] },
          } as any
        }
      />,
    );
    expect(screen.getByRole('heading', { name: 'Only Title Form' })).toBeInTheDocument();
  });

  it('renders only description when title is omitted or empty', () => {
    render(
      <Preview
        definition={
          {
            schema: {
              type: 'object',
              title: '',
              description: 'Only Description Text',
              properties: {},
            },
            uischema: { type: 'VerticalLayout', elements: [] },
          } as any
        }
      />,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Only Description Text')).toBeInTheDocument();
  });

  it('handles non-string title and description safely without rendering header', () => {
    render(
      <Preview
        definition={
          {
            schema: {
              type: 'object',
              title: 123,
              description: null,
              properties: {},
            },
            uischema: { type: 'VerticalLayout', elements: [] },
          } as any
        }
      />,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('updates form runner data on onChange triggers', async () => {
    const user = userEvent.setup();
    render(<Preview definition={mockDefinition as any} />);

    const updateBtn = screen.getByRole('button', { name: 'Update Data' });
    await user.click(updateBtn);

    // Verify state value updates inside parent preview component and propagates to child
    expect(screen.getByText('Data: {"name":"Lewis"}')).toBeInTheDocument();
  });
});
