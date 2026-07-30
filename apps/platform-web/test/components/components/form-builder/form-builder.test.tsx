import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@/components/form-builder/form-builder';
import type { FormDefinition } from '@/lib/services';
import { within } from '@testing-library/react';
import { useState } from 'react';

// Mock dnd-kit context
vi.mock('@dnd-kit/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    DragDropProvider: ({ children, onDragStart, onDragEnd }: any) => (
      <div data-testid="mock-dnd-provider">
        <button
          onClick={() =>
            onDragStart?.({
              operation: { source: { type: 'palette-item', data: { fieldType: 'text' } } },
            })
          }
        >
          Drag Start Palette
        </button>
        <button onClick={() => onDragStart?.({ operation: { source: null } })}>
          Drag Start Null
        </button>
        <button onClick={() => onDragEnd?.({ operation: { source: null, target: null } })}>
          Drag End Null
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'palette-item', data: { fieldType: 'text' } },
                target: { type: 'zone', data: { container: null, index: 0 } },
              },
            })
          }
        >
          Drag End Palette Zone
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'palette-item', data: { fieldType: 'text' } },
                target: { type: 'field', data: {} },
              },
            })
          }
        >
          Drag End Palette Append
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'palette-item', data: { fieldType: 'heading' } },
                target: { type: 'field', data: {} },
              },
            })
          }
        >
          Drag End Palette Heading Append
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'field', data: { path: [0] } },
                target: { type: 'zone', data: { container: null, index: 1 } },
              },
            })
          }
        >
          Drag End Move Zone
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'field', data: {} },
                target: { type: 'zone', data: { container: null, index: 1 } },
              },
            })
          }
        >
          Drag End Move Zone Invalid From
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'field', data: { path: [0] } },
                target: { type: 'zone', data: { container: null } },
              },
            })
          }
        >
          Drag End Move Zone Invalid Index
        </button>
        <button
          onClick={() =>
            onDragEnd?.({
              operation: {
                source: { type: 'field', data: { path: [0] } },
                target: { type: 'field', data: { path: [1] } },
              },
              event: {},
            } as any)
          }
        >
          Drag End Move Field
        </button>
        {children}
      </div>
    ),
    DragOverlay: ({ children }: any) => {
      if (typeof children === 'function') {
        children({ type: 'palette-item', data: { fieldType: 'text' } });
        children({
          type: 'field',
          data: {
            node: {
              kind: 'control',
              fieldType: 'text',
              key: 'test',
              label: 'Test',
              options: {},
              required: false,
            },
          },
        });
        children({ type: 'unknown', data: {} });
        return children({ type: 'palette-item', data: { fieldType: 'text' } });
      }
      return null;
    },
  };
});

// Mock child components
vi.mock('@/components/form-builder/palette', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Palette: (props: any) => (
      <>
        <actual.Palette {...props} />
        <div data-testid="mock-palette">
          <button onClick={() => props.onAdd('text')}>Add Text Field</button>
          <button onClick={() => props.onAdd('heading')}>Add Heading Field</button>
        </div>
      </>
    ),
  };
});

vi.mock('@/components/form-builder/canvas', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Canvas: (props: any) => (
      <>
        <actual.Canvas {...props} />
        <div data-testid="mock-canvas">
          Canvas Title: {props.model.title}
          <button onClick={() => props.onSelect([0])}>Select Field 0</button>
          <button onClick={() => props.onSelect([1])}>Select Field 1</button>
          <button onClick={() => props.onSelect([0, 0])}>Select Field 0-0</button>
          <button onClick={() => props.onDelete([0])}>Delete Field 0</button>
          <button onClick={() => props.onDelete([0, 0])}>Delete Field 0-0</button>
          <button onClick={() => props.onDelete([999])}>Delete Invalid</button>
          <button onClick={() => props.onChangeDisplay?.([999], { text: 'No-op' })}>
            Display Invalid
          </button>
          <button onClick={() => props.onChangeDisplay?.([0, 999], { text: 'No-op' })}>
            Child Invalid
          </button>
          <button onClick={() => props.onChangeForm({ title: 'Updated Canvas Title' })}>
            Change Title
          </button>
        </div>
      </>
    ),
  };
});

vi.mock('@/components/form-builder/inspector', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Inspector: (props: any) => (
      <>
        <actual.Inspector {...props} />
        <div data-testid="mock-inspector">
          Inspector Node: {props.node ? (props.node.label ?? props.node.text ?? 'Node') : 'None'}
          <button onClick={() => props.onChangeForm({ description: 'Updated Form Description' })}>
            Change Description
          </button>
          {props.node && (
            <>
              <button onClick={() => props.onChangeControl?.({ label: 'Updated Field Label' })}>
                Update Selected Control
              </button>
              <button onClick={() => props.onChangeContainer?.({ label: 'Updated Section Label' })}>
                Update Selected Container
              </button>
              <button onClick={() => props.onChangeDisplay?.({ text: 'Updated Display Text' })}>
                Update Selected Display
              </button>
            </>
          )}
        </div>
      </>
    ),
  };
});

vi.mock('@/components/form-builder/preview', () => ({
  default: ({ definition }: any) => (
    <div data-testid="mock-preview">Preview: {JSON.stringify(definition.schema.properties)}</div>
  ),
}));
const EMPTY: { schema: Record<string, unknown>; uischema: Record<string, unknown> } = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

/** Controlled host so tests can observe the emitted definition. */
function Harness({ initial = EMPTY }: { initial?: typeof EMPTY }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <FormBuilder value={value} onChange={setValue} />
      <pre data-testid="dump">{JSON.stringify(value)}</pre>
    </>
  );
}

const dump = () => JSON.parse(screen.getByTestId('dump').textContent ?? '{}');

describe('FormBuilder Component Test Suite', () => {
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

  it('renders optional title and actions toolbars when provided', () => {
    render(
      <FormBuilder
        value={initialValue}
        onChange={vi.fn()}
        title={<div data-testid="custom-title">Custom Title</div>}
        actions={<button data-testid="custom-action">Custom Action</button>}
      />,
    );

    expect(screen.getByTestId('custom-title')).toBeInTheDocument();
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('handles drag and drop event triggers successfully', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormBuilder value={initialValue} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Drag Start Palette' }));
    await user.click(screen.getByRole('button', { name: 'Drag Start Null' }));

    await user.click(screen.getByRole('button', { name: 'Drag End Null' }));
    expect(handleChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Drag End Palette Zone' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            text: expect.any(Object),
          }),
        }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Drag End Palette Append' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            text: expect.any(Object),
          }),
        }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Drag End Move Zone' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.any(Array),
        }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Drag End Move Zone' }));
    handleChange.mockClear();

    await user.click(screen.getByRole('button', { name: 'Drag End Move Zone Invalid From' }));
    expect(handleChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Drag End Move Zone Invalid Index' }));
    expect(handleChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Drag End Move Field' }));
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles invalid path operations gracefully', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<FormBuilder value={initialValue} onChange={handleChange} />);

    const deleteInvalidBtn = screen.getByRole('button', { name: 'Delete Invalid' });
    await user.click(deleteInvalidBtn);
    expect(handleChange).toHaveBeenCalled(); // deleteAt still emits model unmodified
    handleChange.mockClear();

    const displayInvalidBtn = screen.getByRole('button', { name: 'Display Invalid' });
    await user.click(displayInvalidBtn);
    expect(handleChange).not.toHaveBeenCalled(); // replaceAt returns early for invalid top path

    const childInvalidBtn = screen.getByRole('button', { name: 'Child Invalid' });
    await user.click(childInvalidBtn);
    expect(handleChange).toHaveBeenCalled(); // replaceAt falls through and emits when parent is not container
    handleChange.mockClear();

    // Delete nested invalid path where parent is not container (covers line 228)
    const deleteNestedInvalidBtn = screen.getByRole('button', { name: 'Delete Field 0-0' });
    await user.click(deleteNestedInvalidBtn);
    expect(handleChange).toHaveBeenCalled(); // deleteAt still emits model unmodified
  });

  it('handles container and display node selection, updates, and nested deletion', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const valueWithContainerAndDisplay: FormDefinition = {
      schema: {
        type: 'object',
        properties: {
          nested_field: { type: 'string', title: 'Nested' },
        },
        required: [],
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Group',
            label: 'My Section',
            elements: [
              { type: 'Control', scope: '#/properties/nested_field', label: 'Nested' } as any,
            ],
          },
          {
            type: 'Label',
            text: 'Heading Text',
            options: { format: 'heading' },
          },
        ] as any,
      },
    };

    render(<FormBuilder value={valueWithContainerAndDisplay} onChange={handleChange} />);

    // Select container (field 0)
    await user.click(screen.getByRole('button', { name: 'Select Field 0' }));
    expect(screen.getByText('Inspector Node: My Section')).toBeInTheDocument();

    // Update container label
    await user.click(screen.getByRole('button', { name: 'Update Selected Container' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Group',
              label: 'Updated Section Label',
            }),
          ]),
        }),
      }),
    );
    handleChange.mockClear();

    // While container (field 0) is selected, add a text field to it
    await user.click(screen.getByRole('button', { name: 'Select Field 0' }));
    await user.click(screen.getByRole('button', { name: 'Add Text Field' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Group',
              elements: expect.arrayContaining([
                expect.any(Object),
                expect.objectContaining({ type: 'Control' }),
              ]),
            }),
          ]),
        }),
      }),
    );
    handleChange.mockClear();

    // Select display node (field 1)
    await user.click(screen.getByRole('button', { name: 'Select Field 1' }));
    expect(screen.getByText('Inspector Node: Heading Text')).toBeInTheDocument();

    // Update display node text
    await user.click(screen.getByRole('button', { name: 'Update Selected Display' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Label',
              text: 'Updated Display Text',
            }),
          ]),
        }),
      }),
    );
    handleChange.mockClear();

    // Select nested child (field 0-0)
    await user.click(screen.getByRole('button', { name: 'Select Field 0-0' }));
    expect(screen.getByText('Inspector Node: Nested')).toBeInTheDocument();

    // Update nested child label
    await user.click(screen.getByRole('button', { name: 'Update Selected Control' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Group',
              elements: expect.arrayContaining([
                expect.objectContaining({
                  type: 'Control',
                  label: 'Updated Field Label',
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
    handleChange.mockClear();

    // Delete nested child (field 0-0)
    await user.click(screen.getByRole('button', { name: 'Delete Field 0-0' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Group',
              elements: [], // child is deleted
            }),
          ]),
        }),
      }),
    );
    handleChange.mockClear();

    // Test invalid child path replacement on a container node (covers line 92)
    await user.click(screen.getByRole('button', { name: 'Child Invalid' }));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('covers node.kind check branches when adding or dragging display-only fields', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<FormBuilder title="Form Builder" value={initialValue} onChange={handleChange} />);

    // 1. Add Heading display field via clicking palette button (covers line 62)
    await user.click(screen.getByRole('button', { name: 'Add Heading Field' }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Label',
              text: 'Heading',
            }),
          ]),
        }),
      }),
    );
    handleChange.mockClear();

    // 2. Drag and drop Heading display field from palette (covers line 117)
    await user.click(screen.getByRole('button', { name: 'Drag End Palette Heading Append' }));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        uischema: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              type: 'Label',
              text: 'Heading',
            }),
          ]),
        }),
      }),
    );
  });

  it('renders the three columns: palette, canvas, inspector', () => {
    render(<Harness />);
    expect(screen.getByRole('region', { name: /palette/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /canvas/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /inspector/i })).toBeInTheDocument();
  });

  it('shows form settings in the inspector when nothing is selected', () => {
    render(<Harness />);
    const inspector = screen.getByRole('region', { name: /inspector/i });
    expect(within(inspector).getByText(/form settings/i)).toBeInTheDocument();
  });

  it('filters palette items via the search box', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.type(within(palette).getByRole('searchbox'), 'numb');
    expect(within(palette).getByRole('button', { name: /number/i })).toBeInTheDocument();
    expect(within(palette).queryByRole('button', { name: /^text$/i })).not.toBeInTheDocument();
  });

  it('adds a field to the canvas (click-to-add) and emits a control + property', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const after = dump();
    expect(after.uischema.elements).toHaveLength(1);
    expect(after.uischema.elements[0].type).toBe('Control');
    expect(Object.keys(after.schema.properties)).toHaveLength(1);
  });

  it('edits the form title on the canvas, writing schema.title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const canvas = screen.getByRole('region', { name: /canvas/i });
    const title = within(canvas).getByRole('textbox', { name: /^title$/i });
    await user.type(title, 'Apply now');
    expect(dump().schema.title).toBe('Apply now');
  });

  it('selecting a field shows its config in the inspector and edits its label', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(
      within(canvas).getByRole('button', { name: /select field|edit field|field 1/i }),
    );
    const inspector = screen.getByRole('region', { name: /inspector/i });
    const label = within(inspector).getByRole('textbox', { name: /label/i });
    await user.clear(label);
    await user.type(label, 'Email address');
    expect(JSON.stringify(dump())).toContain('Email address');
  });

  it('toggling required updates schema.required', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(
      within(canvas).getByRole('button', { name: /select field|edit field|field 1/i }),
    );
    const inspector = screen.getByRole('region', { name: /inspector/i });
    await user.click(within(inspector).getByRole('switch', { name: /required/i }));
    expect(dump().schema.required.length).toBe(1);
  });

  it('clears the selected field when focusing the form Title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(within(canvas).getByRole('button', { name: /select field 1/i }));
    const inspector = screen.getByRole('region', { name: /inspector/i });
    expect(within(inspector).getByRole('heading', { name: /field settings/i })).toBeInTheDocument();
    // Focusing the form-level Title deselects the field → inspector returns to form settings.
    await user.click(within(canvas).getByRole('textbox', { name: /^title$/i }));
    expect(within(inspector).getByRole('heading', { name: /form settings/i })).toBeInTheDocument();
  });

  it('selects a layout container and shows section settings in the inspector', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^group$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(within(canvas).getByRole('button', { name: /select section/i }));
    const inspector = screen.getByRole('region', { name: /inspector/i });
    expect(within(inspector).getByRole('textbox', { name: /section title/i })).toBeInTheDocument();
  });

  it('deletes a field from the canvas', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(within(canvas).getByRole('button', { name: /delete|remove/i }));
    expect(dump().uischema.elements).toHaveLength(0);
  });

  describe('display fields (inline editing)', () => {
    it('edits a heading inline on the canvas, writing a Label element (no property)', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^heading$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      const input = within(canvas).getByRole('textbox', { name: /^heading$/i });
      await user.clear(input);
      await user.type(input, 'Your details');
      const after = dump();
      expect(after.uischema.elements[0]).toMatchObject({
        type: 'Label',
        text: 'Your details',
        options: { format: 'heading' },
      });
      // A display field collects no data.
      expect(Object.keys(after.schema.properties)).toHaveLength(0);
    });

    it('selecting a heading shows its settings in the inspector and switches level', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^heading$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      // Selecting the card (focusing its inline input) opens the inspector for this display field.
      await user.click(within(canvas).getByRole('textbox', { name: /^heading$/i }));
      const inspector = screen.getByRole('region', { name: /inspector/i });
      expect(within(inspector).getByRole('heading', { name: /content/i })).toBeInTheDocument();
      await user.click(within(inspector).getByRole('button', { name: /subheading/i }));
      expect(dump().uischema.elements[0].options.level).toBe(3);
    });

    it('edits a paragraph inline on the canvas', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^paragraph$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      const input = within(canvas).getByRole('textbox', { name: /^paragraph$/i });
      await user.clear(input);
      await user.type(input, 'Please read.');
      expect(dump().uischema.elements[0]).toMatchObject({
        type: 'Label',
        text: 'Please read.',
        options: { format: 'paragraph' },
      });
    });

    it('sets paragraph alignment via the inspector', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^paragraph$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      await user.click(within(canvas).getByRole('textbox', { name: /^paragraph$/i }));
      const inspector = screen.getByRole('region', { name: /inspector/i });
      await user.click(within(inspector).getByRole('button', { name: /align center/i }));
      expect(dump().uischema.elements[0].options.align).toBe('center');
    });

    it('renders a rich-text editor inline on the canvas for a rich-text display field', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      // Two "Rich text" palette items: the data-collecting control (Rich text group) then the
      // display field (Display group). The second is the display one.
      const richTextButtons = within(palette).getAllByRole('button', { name: /^rich text$/i });
      await user.click(richTextButtons[richTextButtons.length - 1] as HTMLElement);
      const canvas = screen.getByRole('region', { name: /canvas/i });
      // The inline editor exposes its formatting toolbar (proof an editable input is present).
      expect(within(canvas).getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
      expect(dump().uischema.elements[0].options.format).toBe('richtext');
    });
  });
});
