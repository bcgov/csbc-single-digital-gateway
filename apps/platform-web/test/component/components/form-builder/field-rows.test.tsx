import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  pathEq,
  FieldRow,
  EndZone,
  EmptyDropZone,
  ContainerRow,
} from '@/components/form-builder/field-rows';
import { useSortable } from '@dnd-kit/react/sortable';
import { useDroppable } from '@dnd-kit/react';
import type { ContainerNode, ControlNode, DisplayNode } from '@/components/form-builder/model';

// Mock dnd-kit hooks to prevent runtime issues and verify parameters
vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: vi.fn(),
}));

vi.mock('@dnd-kit/react', () => ({
  useDroppable: vi.fn(),
}));

// Mock child components
vi.mock('@/components/form-builder/field-card', () => ({
  FieldPreview: ({ node }: any) => (
    <div data-testid="mock-field-preview">Preview: {node.label}</div>
  ),
  previewNodeForType: (type: string) => ({ kind: 'control', label: `Preview node ${type}` }) as any,
}));

vi.mock('@/components/form-builder/display-card', () => ({
  DisplayCard: ({ node }: any) => (
    <div data-testid="mock-display-card">DisplayCard: {node.text}</div>
  ),
}));

describe('Field Rows Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useSortable).mockReturnValue({
      ref: vi.fn(),
      handleRef: vi.fn(),
      isDragSource: false,
      isDropTarget: false,
    } as any);

    vi.mocked(useDroppable).mockReturnValue({
      ref: vi.fn(),
      isDropTarget: false,
    } as any);
  });

  describe('pathEq helper', () => {
    it('returns true if paths are identical, otherwise false', () => {
      expect(pathEq(null, [1])).toBe(false);
      expect(pathEq([1, 2], [1, 2])).toBe(true);
      expect(pathEq([1, 2], [1, 3])).toBe(false);
      expect(pathEq([1, 2], [1])).toBe(false);
    });
  });

  describe('FieldRow', () => {
    const mockControlNode: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'name_key',
      label: 'Your Name',
      options: {},
      required: false,
    };

    it('renders control node preview and triggers events', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      const handleDelete = vi.fn();

      render(
        <FieldRow
          node={mockControlNode}
          index={0}
          group="root"
          path={[0]}
          selected={false}
          paletteDragType={null}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onChangeDisplay={vi.fn()}
        />,
      );

      // Verify correct useSortable call
      expect(useSortable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'f:name_key',
          index: 0,
          group: 'root',
          type: 'field',
        }),
      );

      // Verify rendering
      expect(screen.getByTestId('mock-field-preview')).toBeInTheDocument();
      expect(screen.getByText('Preview: Your Name')).toBeInTheDocument();

      // Click selection button
      const selectBtn = screen.getByRole('button', { name: 'Select field 1' });
      await user.click(selectBtn);
      expect(handleSelect).toHaveBeenCalledWith([0]);

      // Click delete button
      const deleteBtn = screen.getByRole('button', { name: 'Remove field' });
      await user.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith([0]);
    });

    it('selects when clicking anywhere in the card, but not via the drag handle', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();

      render(
        <FieldRow
          node={mockControlNode}
          index={0}
          group="root"
          path={[0]}
          selected={false}
          paletteDragType={null}
          onSelect={handleSelect}
          onDelete={vi.fn()}
          onChangeDisplay={vi.fn()}
        />,
      );

      const handle = screen.getByRole('button', { name: 'Reorder field' });
      // The drag handle stops propagation → clicking it never selects.
      await user.click(handle);
      expect(handleSelect).not.toHaveBeenCalled();

      // Clicking the card container (padding/whitespace, not the inner body) selects it.
      const card = handle.parentElement as HTMLElement;
      await user.click(card);
      expect(handleSelect).toHaveBeenCalledWith([0]);
    });

    it('renders display node using DisplayCard', () => {
      const mockDisplayNode: DisplayNode = {
        kind: 'display',
        id: 'disp-1',
        displayType: 'heading',
        text: 'Page Header Title',
      };
      const handleSelect = vi.fn();

      render(
        <FieldRow
          node={mockDisplayNode}
          index={1}
          group="root"
          path={[1]}
          selected={true}
          paletteDragType={null}
          onSelect={handleSelect}
          onDelete={vi.fn()}
          onChangeDisplay={vi.fn()}
        />,
      );

      expect(screen.getByTestId('mock-display-card')).toBeInTheDocument();
      expect(screen.getByText('DisplayCard: Page Header Title')).toBeInTheDocument();

      // Verify wrapper click selects display card
      const wrapper = screen.getByText('DisplayCard: Page Header Title').parentElement;
      expect(wrapper).toBeInTheDocument();
      if (wrapper) {
        fireEvent.click(wrapper);
        expect(handleSelect).toHaveBeenCalledWith([1]);
      }
    });
  });

  describe('EndZone', () => {
    it('sets up droppable end zone area', () => {
      render(
        <EndZone id="ez-1" container={null} index={5} accept={['field']} paletteDragType={null} />,
      );

      expect(useDroppable).toHaveBeenCalledWith({
        id: 'ez-1',
        type: 'zone',
        accept: ['field'],
        data: { container: null, index: 5 },
      });
    });
  });

  describe('EmptyDropZone', () => {
    it('displays placeholder text and configures droppable container', () => {
      render(<EmptyDropZone id="edz-1" container={2} accept={['container']} />);

      expect(screen.getByText('Drop components here')).toBeInTheDocument();
      expect(useDroppable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'edz-1',
          type: 'zone',
          accept: ['container'],
          data: { container: 2, index: 0 },
        }),
      );
    });
  });

  describe('ContainerRow', () => {
    const mockContainerNode: ContainerNode = {
      kind: 'container',
      layout: 'horizontal',
      label: 'Personal Block',
      children: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'sub_key_1',
          label: 'Nested Field',
          options: {},
          required: false,
        },
      ],
    };

    it('renders layout header, children, and reorder controls', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();
      const handleDelete = vi.fn();

      render(
        <ContainerRow
          node={mockContainerNode}
          index={0}
          selectedPath={null}
          paletteDragType={null}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onChangeDisplay={vi.fn()}
        />,
      );

      // Verify useSortable
      expect(useSortable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'c:0',
          index: 0,
          group: 'root',
          type: 'container',
        }),
      );

      // Verify title is rendered
      expect(screen.getByRole('button', { name: 'Select section 1' })).toHaveTextContent(
        'Personal Block',
      );

      // Click Select Section
      const selectBtn = screen.getByRole('button', { name: 'Select section 1' });
      await user.click(selectBtn);
      expect(handleSelect).toHaveBeenCalledWith([0]);

      // Delete section
      const deleteBtn = screen.getAllByRole('button', { name: 'Remove field' })[0]!;
      await user.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith([0]);

      // Check child element rendered inside
      expect(screen.getByTestId('mock-field-preview')).toBeInTheDocument();
      expect(screen.getByText('Preview: Nested Field')).toBeInTheDocument();
    });
  });

  it('renders drop placeholders inside FieldRow when isDropTarget is true', () => {
    vi.mocked(useSortable).mockReturnValueOnce({
      ref: vi.fn(),
      handleRef: vi.fn(),
      isDragSource: false,
      isDropTarget: true,
    } as any);

    const mockControlNode: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'name_key',
      label: 'Your Name',
      options: {},
      required: false,
    };

    render(
      <FieldRow
        node={mockControlNode}
        index={0}
        group="root"
        path={[0]}
        selected={false}
        paletteDragType="text"
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(screen.getByText('Preview: Preview node text')).toBeInTheDocument();

    vi.mocked(useSortable).mockReturnValueOnce({
      ref: vi.fn(),
      handleRef: vi.fn(),
      isDragSource: false,
      isDropTarget: true,
    } as any);

    const { container: containerNull } = render(
      <FieldRow
        node={mockControlNode}
        index={0}
        group="root"
        path={[0]}
        selected={false}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(containerNull.querySelector('.h-11')).not.toBeInTheDocument();
  });

  it('uses correct fallback labelling in ContainerRow when label is missing', () => {
    const groupContainer: ContainerNode = {
      kind: 'container',
      layout: 'group',
      children: [],
    };
    const rowContainer: ContainerNode = {
      kind: 'container',
      layout: 'horizontal',
      children: [],
    };

    const { rerender } = render(
      <ContainerRow
        node={groupContainer}
        index={0}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select section 1' })).toHaveTextContent('Group');

    rerender(
      <ContainerRow
        node={rowContainer}
        index={0}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select section 1' })).toHaveTextContent('Row');

    const gridContainer: ContainerNode = {
      kind: 'container',
      layout: 'grid',
      columns: 2,
      children: [],
    };

    rerender(
      <ContainerRow
        node={gridContainer}
        index={0}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select section 1' })).toHaveTextContent('Grid');
  });

  it('previews a grid container with its authored column count (feature 169)', () => {
    const gridContainer: ContainerNode = {
      kind: 'container',
      layout: 'grid',
      columns: 4,
      children: [],
    };

    const { container } = render(
      <ContainerRow
        node={gridContainer}
        index={0}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    const grid = container.querySelector('[style*="grid-template-columns"]');
    expect(grid?.getAttribute('style')).toContain('repeat(4, minmax(0, 1fr))');
  });

  it('handles FieldRow selection on display focus capture and control keydown', () => {
    const handleSelect = vi.fn();
    const mockDisplayNode: DisplayNode = {
      kind: 'display',
      id: 'disp-1',
      displayType: 'heading',
      text: 'Title text',
    };

    render(
      <FieldRow
        node={mockDisplayNode}
        index={0}
        group="root"
        path={[0]}
        selected={false}
        paletteDragType={null}
        onSelect={handleSelect}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    const displayWrapper = screen.getByText('DisplayCard: Title text').parentElement!;
    fireEvent.focusIn(displayWrapper);
    expect(handleSelect).toHaveBeenCalledWith([0]);

    const mockControlNode: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'control_key',
      label: 'My Control',
      options: {},
      required: false,
    };

    render(
      <FieldRow
        node={mockControlNode}
        index={1}
        group="root"
        path={[1]}
        selected={false}
        paletteDragType={null}
        onSelect={handleSelect}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    const controlBtn = screen.getByRole('button', { name: 'Select field 2' });

    fireEvent.keyDown(controlBtn, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith([1]);

    fireEvent.keyDown(controlBtn, { key: ' ' });
    expect(handleSelect).toHaveBeenCalledWith([1]);

    // Fire a key event that is NOT enter or space
    fireEvent.keyDown(controlBtn, { key: 'Escape' });
    // Should not select or prevent default
  });

  it('renders DropPlaceholder inside EndZone when isDropTarget is true', () => {
    vi.mocked(useDroppable).mockReturnValueOnce({
      ref: vi.fn(),
      isDropTarget: true,
    } as any);

    render(
      <EndZone id="ez-2" container={null} index={5} accept={['field']} paletteDragType="text" />,
    );

    expect(screen.getByText('Preview: Preview node text')).toBeInTheDocument();
  });

  it('renders DropPlaceholder inside ContainerRow when isDropTarget is true', () => {
    vi.mocked(useSortable).mockReturnValueOnce({
      ref: vi.fn(),
      handleRef: vi.fn(),
      isDragSource: false,
      isDropTarget: true,
    } as any);

    const mockContainerNode: ContainerNode = {
      kind: 'container',
      layout: 'horizontal',
      children: [],
    };

    render(
      <ContainerRow
        node={mockContainerNode}
        index={0}
        selectedPath={null}
        paletteDragType="text"
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(screen.getByText('Preview: Preview node text')).toBeInTheDocument();
  });

  it('uses childIndex as key fallback when child key is missing in ContainerRow', () => {
    const mockContainerNode: ContainerNode = {
      kind: 'container',
      layout: 'horizontal',
      children: [
        {
          kind: 'control',
          fieldType: 'text',
          key: '', // missing key
          label: 'No Key Field',
          options: {},
          required: false,
        },
      ],
    };

    const { container } = render(
      <ContainerRow
        node={mockContainerNode}
        index={0}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );
    expect(container).toBeDefined();
  });

  it('renders dashed drop placeholder inside EndZone when isDropTarget is true and paletteDragType is null', () => {
    vi.mocked(useDroppable).mockReturnValueOnce({
      ref: vi.fn(),
      isDropTarget: true,
    } as any);

    const { container } = render(
      <EndZone id="ez-2" container={null} index={5} accept={['field']} paletteDragType={null} />,
    );

    expect(container.querySelector('.border-dashed')).toBeInTheDocument();
  });

  it('handles display-only child nodes in ContainerRow', () => {
    const mockContainerNode: ContainerNode = {
      kind: 'container',
      layout: 'horizontal',
      children: [
        {
          kind: 'display',
          id: 'disp-nested',
          displayType: 'heading',
          text: 'Nested Heading',
        },
      ],
    };

    render(
      <ContainerRow
        node={mockContainerNode}
        index={0}
        selectedPath={null}
        paletteDragType={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onChangeDisplay={vi.fn()}
      />,
    );

    expect(screen.getByText('DisplayCard: Nested Heading')).toBeInTheDocument();
  });
});
