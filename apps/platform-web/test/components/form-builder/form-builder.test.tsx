import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@/components/form-builder/form-builder';
import type { FormDefinition } from '@/lib/services';

// Mock dnd-kit context
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }: any) => <div data-testid="mock-dnd-provider">{children}</div>,
  DragOverlay: () => null,
}));

// Mock child components
vi.mock('@/components/form-builder/palette', () => ({
  Palette: ({ onAdd }: any) => (
    <div data-testid="mock-palette">
      <button onClick={() => onAdd('text')}>Add Text Field</button>
    </div>
  ),
}));

vi.mock('@/components/form-builder/canvas', () => ({
  Canvas: ({ model, onSelect, onDelete, onChangeForm }: any) => (
    <div data-testid="mock-canvas">
      Canvas Title: {model.title}
      <button onClick={() => onSelect([0])}>Select Field 0</button>
      <button onClick={() => onDelete([0])}>Delete Field 0</button>
      <button onClick={() => onChangeForm({ title: 'Updated Canvas Title' })}>Change Title</button>
    </div>
  ),
}));

vi.mock('@/components/form-builder/inspector', () => ({
  Inspector: ({ node, onChangeForm, onChangeControl }: any) => (
    <div data-testid="mock-inspector">
      Inspector Node: {node ? node.label : 'None'}
      <button onClick={() => onChangeForm({ description: 'Updated Form Description' })}>
        Change Description
      </button>
      {node && (
        <button onClick={() => onChangeControl({ label: 'Updated Field Label' })}>
          Update Selected Control
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/form-builder/preview', () => ({
  default: ({ definition }: any) => (
    <div data-testid="mock-preview">Preview: {JSON.stringify(definition.schema.properties)}</div>
  ),
}));

describe('FormBuilder', () => {
  const initialValue: FormDefinition = {
    schema: {
      type: 'object',
      properties: {
        fullname: { type: 'string', title: 'Full Name' },
      },
      required: [],
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/fullname', label: 'Full Name' } as any],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Build view with Palette, Canvas, and Inspector by default', () => {
    render(<FormBuilder value={initialValue} onChange={vi.fn()} />);

    expect(screen.getByTestId('mock-palette')).toBeInTheDocument();
    expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('mock-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-preview')).not.toBeInTheDocument();
  });

  it('switches to Preview tab and renders the preview component', async () => {
    const user = userEvent.setup();
    render(<FormBuilder value={initialValue} onChange={vi.fn()} />);

    // Click Preview tab
    const previewTab = screen.getByRole('tab', { name: 'Preview' });
    await user.click(previewTab);

    expect(screen.queryByTestId('mock-palette')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-canvas')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-inspector')).not.toBeInTheDocument();

    // Verify preview renders with definition
    expect(await screen.findByTestId('mock-preview')).toBeInTheDocument();
    expect(screen.getByText(/"fullname"/)).toBeInTheDocument();
  });

  it('triggers onChange when modifying form metadata (title & description)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormBuilder value={initialValue} onChange={handleChange} />);

    // Click Change Title inside mock Canvas
    const titleBtn = screen.getByRole('button', { name: 'Change Title' });
    await user.click(titleBtn);

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          title: 'Updated Canvas Title',
        }),
      }),
    );

    // Click Change Description inside mock Inspector
    const descBtn = screen.getByRole('button', { name: 'Change Description' });
    await user.click(descBtn);

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          description: 'Updated Form Description',
        }),
      }),
    );
  });

  it('handles field selection and edits field control configuration', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormBuilder value={initialValue} onChange={handleChange} />);

    // Inspector shows None initially
    expect(screen.getByText('Inspector Node: None')).toBeInTheDocument();

    // Click Select Field 0 inside mock Canvas
    const selectBtn = screen.getByRole('button', { name: 'Select Field 0' });
    await user.click(selectBtn);

    // Inspector now shows active selected control label
    expect(screen.getByText('Inspector Node: Full Name')).toBeInTheDocument();

    // Trigger update on selected control
    const updateControlBtn = screen.getByRole('button', { name: 'Update Selected Control' });
    await user.click(updateControlBtn);

    // Verify handleChange is called with updated label in uischema scope
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: [
            expect.objectContaining({
              label: 'Updated Field Label',
            }),
          ],
        }),
      }),
    );
  });

  it('handles deletion of field', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormBuilder value={initialValue} onChange={handleChange} />);

    const deleteBtn = screen.getByRole('button', { name: 'Delete Field 0' });
    await user.click(deleteBtn);

    expect(handleChange).toHaveBeenCalledWith({
      schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [],
      },
    });
  });

  it('handles adding new fields from the palette', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormBuilder value={initialValue} onChange={handleChange} />);

    const addBtn = screen.getByRole('button', { name: 'Add Text Field' });
    await user.click(addBtn);

    // Verify schema properties now contains two fields (the original fullname + newly created text field)
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            fullname: expect.any(Object),
            text: expect.any(Object),
          }),
        }),
      }),
    );
  });
});
