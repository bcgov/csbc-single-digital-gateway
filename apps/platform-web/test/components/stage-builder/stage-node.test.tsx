import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StageNode } from '@/components/stage-builder/stage-node';
import { StageBuilderContext } from '@/components/stage-builder/stage-context';
import type { StageBuilderApi } from '@/components/stage-builder/stage-context';

// Mock dnd-kit context
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }: any) => (
    <div data-testid="mock-drag-drop-provider">{children}</div>
  ),
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    ref: () => {},
    handleRef: () => {},
  }),
}));

// Mock @xyflow/react
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: any) => <div data-testid={`mock-handle-${type}-${position}`} />,
  Position: {
    Left: 'left',
    Right: 'right',
  },
}));

describe('StageNode', () => {
  const mockApi: StageBuilderApi = {
    def: {
      name: 'Flow Definition',
      description: '',
      stages: [
        {
          id: 'stage-1',
          name: 'Stage One',
          position: { x: 0, y: 0 },
          pages: [
            {
              id: 'page-1',
              name: 'Page Alpha',
              description: '',
              schema: { type: 'object', properties: { username: { type: 'string' } } },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          ],
        },
      ],
      edges: [],
    },
    addPage: vi.fn(),
    removePage: vi.fn(),
    reorderPages: vi.fn(),
    renameStage: vi.fn(),
    removeStage: vi.fn(),
    selectPage: vi.fn(),
    addAfter: vi.fn(),
    addBefore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with stage details, handles, and action stubs', () => {
    render(
      <StageBuilderContext.Provider value={mockApi}>
        <StageNode
          {...({
            id: 'stage-1',
            type: 'stage',
            selected: false,
            zIndex: 1,
            isConnectable: true,
            data: {},
          } as any)}
        />
      </StageBuilderContext.Provider>,
    );

    // Verify stage name
    expect(screen.getByLabelText('Stage name')).toHaveValue('Stage One');

    // Verify xyflow Handles
    expect(screen.getByTestId('mock-handle-target-left')).toBeInTheDocument();
    expect(screen.getByTestId('mock-handle-source-right')).toBeInTheDocument();

    // Since edges is empty, both left/right add-stage buttons are visible
    expect(screen.getByLabelText('Add stage before')).toBeInTheDocument();
    expect(screen.getByLabelText('Add stage after')).toBeInTheDocument();

    // Verify PageRow is rendered
    expect(screen.getByText('Page Alpha')).toBeInTheDocument();
    expect(screen.getByText('1 field')).toBeInTheDocument();
  });

  it('triggers renameStage when changing stage name input', async () => {
    const user = userEvent.setup();
    render(
      <StageBuilderContext.Provider value={mockApi}>
        <StageNode
          {...({
            id: 'stage-1',
            type: 'stage',
            selected: false,
            zIndex: 1,
            isConnectable: true,
            data: {},
          } as any)}
        />
      </StageBuilderContext.Provider>,
    );

    const input = screen.getByLabelText('Stage name');
    await user.type(input, '!');

    expect(mockApi.renameStage).toHaveBeenCalledWith('stage-1', 'Stage One!');
  });

  it('triggers removeStage when clicking delete stage button', async () => {
    const user = userEvent.setup();
    render(
      <StageBuilderContext.Provider value={mockApi}>
        <StageNode
          {...({
            id: 'stage-1',
            type: 'stage',
            selected: false,
            zIndex: 1,
            isConnectable: true,
            data: {},
          } as any)}
        />
      </StageBuilderContext.Provider>,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Remove stage' });
    await user.click(deleteBtn);

    expect(mockApi.removeStage).toHaveBeenCalledWith('stage-1');
  });

  it('triggers addBefore / addAfter when clicking left / right add buttons', async () => {
    const user = userEvent.setup();
    render(
      <StageBuilderContext.Provider value={mockApi}>
        <StageNode
          {...({
            id: 'stage-1',
            type: 'stage',
            selected: false,
            zIndex: 1,
            isConnectable: true,
            data: {},
          } as any)}
        />
      </StageBuilderContext.Provider>,
    );

    await user.click(screen.getByLabelText('Add stage before'));
    expect(mockApi.addBefore).toHaveBeenCalledWith('stage-1');

    await user.click(screen.getByLabelText('Add stage after'));
    expect(mockApi.addAfter).toHaveBeenCalledWith('stage-1');
  });

  it('triggers selectPage / removePage / addPage from page actions', async () => {
    const user = userEvent.setup();
    render(
      <StageBuilderContext.Provider value={mockApi}>
        <StageNode
          {...({
            id: 'stage-1',
            type: 'stage',
            selected: false,
            zIndex: 1,
            isConnectable: true,
            data: {},
          } as any)}
        />
      </StageBuilderContext.Provider>,
    );

    // Click select page (Page Alpha area)
    const pageSelectBtn = screen.getByRole('button', { name: /Page Alpha/ });
    await user.click(pageSelectBtn);
    expect(mockApi.selectPage).toHaveBeenCalledWith('stage-1', 'page-1');

    // Click remove page
    const removePageBtn = screen.getByRole('button', { name: 'Remove page' });
    await user.click(removePageBtn);
    expect(mockApi.removePage).toHaveBeenCalledWith('stage-1', 'page-1');

    // Click add page
    const addPageBtn = screen.getByRole('button', { name: 'Add page' });
    await user.click(addPageBtn);
    expect(mockApi.addPage).toHaveBeenCalledWith('stage-1');
  });
});
