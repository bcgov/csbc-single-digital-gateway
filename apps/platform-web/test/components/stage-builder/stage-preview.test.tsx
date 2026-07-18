import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StagePreview from '@/components/stage-builder/stage-preview';
import type { MultiStageDefinition } from '@/components/stage-builder/stage-model';

// Mock FormRunner from shared repo library
vi.mock('@repo/react/form-runner', () => ({
  FormRunner: ({ kind, definition, data, onChange }: any) => (
    <div data-testid="mock-form-runner">
      <span>Kind: {kind}</span>
      <span>Definition Name: {definition.name}</span>
      <span>Data: {JSON.stringify(data)}</span>
      <button onClick={() => onChange({ stepValue: 'done' })}>Update Data</button>
    </div>
  ),
}));

describe('StagePreview', () => {
  const mockDefinition: MultiStageDefinition = {
    name: 'Multi-stage Intake Process',
    description: 'Process pipeline.',
    stages: [],
    edges: [],
  };

  it('renders FormRunner with multi-stage kind and definition', () => {
    render(<StagePreview definition={mockDefinition} />);

    expect(screen.getByTestId('mock-form-runner')).toBeInTheDocument();
    expect(screen.getByText('Kind: multi-stage-form')).toBeInTheDocument();
    expect(screen.getByText('Definition Name: Multi-stage Intake Process')).toBeInTheDocument();
    expect(screen.getByText('Data: {}')).toBeInTheDocument();
  });

  it('updates form runner data on onChange triggers', async () => {
    const user = userEvent.setup();
    render(<StagePreview definition={mockDefinition} />);

    const updateBtn = screen.getByRole('button', { name: 'Update Data' });
    await user.click(updateBtn);

    // Verify data state is updated and passed to FormRunner
    expect(screen.getByText('Data: {"stepValue":"done"}')).toBeInTheDocument();
  });
});
