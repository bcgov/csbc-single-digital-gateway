import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Canvas } from '@/components/form-builder/canvas';
import type { FormModel } from '@/components/form-builder/model';

vi.mock('@/components/form-builder/field-rows', () => ({
  ContainerRow: ({ node, index }: any) => (
    <div data-testid={`mock-container-row-${index}`}>Container: {node.title || node.id}</div>
  ),
  FieldRow: ({ node, index }: any) => (
    <div data-testid={`mock-field-row-${index}`}>Field: {node.label || node.id}</div>
  ),
  EmptyDropZone: () => <div data-testid="mock-empty-dropzone" />,
  EndZone: () => <div data-testid="mock-end-zone" />,
  pathEq: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
}));

describe('Canvas', () => {
  const defaultModel: FormModel = {
    title: 'Customer Survey',
    description: 'Please answer these questions honestly.',
    fields: [],
  };

  it('renders title and description from form model', () => {
    render(
      <Canvas
        model={defaultModel}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toHaveValue('Customer Survey');

    const descTextarea = screen.getByLabelText('Description');
    expect(descTextarea).toHaveValue('Please answer these questions honestly.');
  });

  it('triggers onChangeForm when typing in title or description', async () => {
    const user = userEvent.setup();
    const handleChangeForm = vi.fn();

    render(
      <Canvas
        model={defaultModel}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={handleChangeForm}
      />,
    );

    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, '!');
    expect(handleChangeForm).toHaveBeenCalledWith({ title: 'Customer Survey!' });

    const descTextarea = screen.getByLabelText('Description');
    await user.type(descTextarea, '!');
    expect(handleChangeForm).toHaveBeenCalledWith({
      description: 'Please answer these questions honestly.!',
    });
  });

  it('renders EmptyDropZone when fields array is empty', () => {
    render(
      <Canvas
        model={defaultModel}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByTestId('mock-empty-dropzone')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-end-zone')).not.toBeInTheDocument();
  });

  it('renders FieldRow and ContainerRow components and EndZone when fields exist', () => {
    const modelWithFields: FormModel = {
      title: 'Survey',
      description: 'Desc',
      fields: [
        { kind: 'control', id: 'f-1', label: 'First Name', type: 'text' } as any,
        { kind: 'container', id: 'c-1', title: 'Address Block', fields: [] } as any,
      ],
    };

    render(
      <Canvas
        model={modelWithFields}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByTestId('mock-field-row-0')).toBeInTheDocument();
    expect(screen.getByText('Field: First Name')).toBeInTheDocument();

    expect(screen.getByTestId('mock-container-row-1')).toBeInTheDocument();
    expect(screen.getByText('Container: Address Block')).toBeInTheDocument();

    expect(screen.getByTestId('mock-end-zone')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-empty-dropzone')).not.toBeInTheDocument();
  });

  it('calls onSelect(null) when clicking outer canvas container or focusing input', async () => {
    const handleSelect = vi.fn();

    render(
      <Canvas
        model={defaultModel}
        selectedPath={null}
        paletteDragType={null}
        onSelect={handleSelect}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    // Click canvas container
    const section = screen.getByRole('region', { name: 'Canvas' });
    fireEvent.click(section);
    expect(handleSelect).toHaveBeenCalledWith(null);

    // Focus input
    const titleInput = screen.getByLabelText('Title');
    fireEvent.focus(titleInput);
    expect(handleSelect).toHaveBeenCalledWith(null);
  });
});
