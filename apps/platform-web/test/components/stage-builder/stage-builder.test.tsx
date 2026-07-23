import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { StageBuilder } from '@/components/stage-builder/stage-builder';
import type { MultiStageDefinition } from '@/components/stage-builder/stage-model';
import { useStageBuilder } from '@/components/stage-builder/stage-context';

// Mock @xyflow/react
vi.mock('@xyflow/react', () => {
  return {
    ReactFlow: ({ children, nodes, nodeTypes, onEdgesDelete }: any) => (
      <div data-testid="mock-react-flow">
        <button onClick={() => onEdgesDelete?.([{ id: 'edge-1' }])}>Trigger Edge Delete</button>
        {nodes.map((node: any) => {
          const NodeType = nodeTypes[node.type];
          return (
            <div key={node.id} data-testid={`node-${node.id}`}>
              {NodeType ? <NodeType id={node.id} data={node.data} /> : null}
            </div>
          );
        })}
        {children}
      </div>
    ),
    useNodesState: (initialNodes: any) => {
      const [nodes, setNodes] = useState(initialNodes);
      const onNodesChange = vi.fn();
      return [nodes, setNodes, onNodesChange];
    },
    useReactFlow: () => ({
      fitView: vi.fn(),
    }),
    Background: () => <div data-testid="mock-background" />,
    Controls: () => <div data-testid="mock-controls" />,
  };
});

// Mock StageNode which uses useStageBuilder context to render buttons
vi.mock('@/components/stage-builder/stage-node', () => {
  return {
    StageNode: ({ id }: any) => {
      const api = useStageBuilder();
      const stage = api.def.stages.find((s) => s.id === id);
      if (!stage) return null;

      return (
        <div data-testid={`mock-stage-node-${id}`}>
          <h3>Stage Node: {stage.name}</h3>
          <button onClick={() => api.addPage(id)}>Add Page</button>
          <button onClick={() => api.removeStage(id)}>Remove Stage</button>
          <button onClick={() => api.reorderPages(id, 0, 1)}>Reorder Pages</button>
          <button onClick={() => api.renameStage(id, 'Renamed Stage')}>Rename Stage</button>
          <button onClick={() => api.addAfter(id)}>Add After</button>
          <button onClick={() => api.addBefore(id)}>Add Before</button>
          {stage.pages.map((p) => (
            <div key={p.id} data-testid={`page-row-${p.id}`}>
              <span>Page: {p.name}</span>
              <button onClick={() => api.selectPage(id, p.id)}>Edit Page</button>
              <button onClick={() => api.removePage(id, p.id)}>Remove Page: {p.name}</button>
            </div>
          ))}
        </div>
      );
    },
  };
});

// Mock FormBuilderDialog
vi.mock('@/components/form-builder/builder-dialog', () => ({
  FormBuilderDialog: ({ onOpenChange, title, onChange }: any) => (
    <div data-testid="mock-form-builder-dialog">
      <h2>{title}</h2>
      <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      <button onClick={() => onOpenChange(true)}>Trigger Open True</button>
      <button
        onClick={() =>
          onChange({ schema: { type: 'object' }, uischema: { type: 'VerticalLayout' } })
        }
      >
        Save Definition
      </button>
    </div>
  ),
}));

// Mock StagePreview
vi.mock('@/components/stage-builder/stage-preview', () => ({
  default: ({ definition }: any) => (
    <div data-testid="mock-stage-preview">Previewing: {definition.name}</div>
  ),
}));

describe('StageBuilder', () => {
  const initialValue: MultiStageDefinition = {
    name: 'Application Form Flow',
    description: 'Main intake stages.',
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
            schema: { type: 'object', properties: {} },
            uischema: { type: 'VerticalLayout', elements: [] },
          },
        ],
      },
    ],
    edges: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default form name and stages in build tab', () => {
    render(<StageBuilder value={initialValue} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Form name')).toHaveValue('Application Form Flow');
    expect(screen.getByLabelText('Description')).toHaveValue('Main intake stages.');
    expect(screen.getByTestId('mock-react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('mock-background')).toBeInTheDocument();
    expect(screen.getByTestId('mock-controls')).toBeInTheDocument();

    // Verify stage node renders inside ReactFlow
    expect(screen.getByTestId('mock-stage-node-stage-1')).toBeInTheDocument();
    expect(screen.getByText('Stage Node: Stage One')).toBeInTheDocument();
  });

  it('switches to preview tab and renders StagePreview', async () => {
    const user = userEvent.setup();
    render(<StageBuilder value={initialValue} onChange={vi.fn()} />);

    const previewTab = screen.getByRole('tab', { name: 'Preview' });
    await user.click(previewTab);

    expect(screen.queryByTestId('mock-react-flow')).not.toBeInTheDocument();
    expect(await screen.findByTestId('mock-stage-preview')).toBeInTheDocument();
    expect(screen.getByText('Previewing: Application Form Flow')).toBeInTheDocument();
  });

  it('triggers onChange when modifying form metadata (name & description)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StageBuilder value={initialValue} onChange={handleChange} />);

    // Edit Name
    const nameInput = screen.getByLabelText('Form name');
    await user.type(nameInput, '!');
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Application Form Flow!',
      }),
    );

    // Edit Description
    const descInput = screen.getByLabelText('Description');
    await user.type(descInput, '!');
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Main intake stages.!',
      }),
    );
  });

  it('triggers onChange when clicking Add Stage', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StageBuilder value={initialValue} onChange={handleChange} />);

    const addStageBtn = screen.getByRole('button', { name: 'Add stage' });
    await user.click(addStageBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: expect.arrayContaining([
          expect.objectContaining({ id: 'stage-1' }),
          expect.objectContaining({ name: 'New stage' }),
        ]),
      }),
    );
  });

  it('handles StageNode callback triggers: Add Page and Remove Page', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    // Give two pages so removing one is allowed by stage-model rules
    const twoPageVal: MultiStageDefinition = {
      ...initialValue,
      stages: [
        {
          ...initialValue.stages[0]!,
          pages: [
            {
              id: 'page-1',
              name: 'Page Alpha',
              description: '',
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
            {
              id: 'page-2',
              name: 'Page Beta',
              description: '',
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          ],
        },
      ],
    };

    render(<StageBuilder value={twoPageVal} onChange={handleChange} />);

    // Click Add Page on Stage One
    const addPageBtn = screen.getByRole('button', { name: 'Add Page' });
    await user.click(addPageBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: [
          expect.objectContaining({
            id: 'stage-1',
            pages: expect.arrayContaining([
              expect.objectContaining({ name: 'Page Alpha' }),
              expect.objectContaining({ name: 'Page Beta' }),
              expect.objectContaining({ name: 'Untitled page' }),
            ]),
          }),
        ],
      }),
    );

    // Click Remove Page (Page Alpha) on Stage One
    const removePageBtn = screen.getByRole('button', { name: 'Remove Page: Page Alpha' });
    await user.click(removePageBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: [
          expect.objectContaining({
            id: 'stage-1',
            pages: [expect.objectContaining({ id: 'page-2', name: 'Page Beta' })],
          }),
        ],
      }),
    );
  });

  it('handles StageNode callback trigger: Remove Stage', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    // Spy and mock confirm dialog to return true
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockImplementation(() => true);

    // Give two stages so removing one is allowed by stage-model rules
    const twoStageVal: MultiStageDefinition = {
      ...initialValue,
      stages: [
        ...initialValue.stages,
        {
          id: 'stage-2',
          name: 'Stage Two',
          position: { x: 320, y: 0 },
          pages: [
            {
              id: 'page-2',
              name: 'Page Beta',
              description: '',
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          ],
        },
      ],
    };

    render(<StageBuilder value={twoStageVal} onChange={handleChange} />);

    // Click Remove Stage under Stage Two
    const removeBtns = screen.getAllByRole('button', { name: 'Remove Stage' });
    // Click on Stage Two (index 1) remove button
    await user.click(removeBtns[1]!);

    expect(confirmSpy).toHaveBeenCalledWith('Delete this stage and all its pages?');
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: [expect.objectContaining({ id: 'stage-1', name: 'Stage One' })],
      }),
    );
  });

  it('opens FormBuilderDialog when selecting a page, saves edits, and closes dialog', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StageBuilder value={initialValue} onChange={handleChange} />);

    // No dialog by default
    expect(screen.queryByTestId('mock-form-builder-dialog')).not.toBeInTheDocument();

    // Select Edit Page to open FormBuilderDialog
    const editPageBtn = screen.getByRole('button', { name: 'Edit Page' });
    await user.click(editPageBtn);

    expect(screen.getByTestId('mock-form-builder-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit page — Page Alpha')).toBeInTheDocument();

    // Trigger save inside dialog
    const saveBtn = screen.getByRole('button', { name: 'Save Definition' });
    await user.click(saveBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stages: [
          expect.objectContaining({
            id: 'stage-1',
            pages: [
              expect.objectContaining({
                id: 'page-1',
                schema: expect.objectContaining({ type: 'object' }),
              }),
            ],
          }),
        ],
      }),
    );

    // Close dialog
    const closeBtn = screen.getByRole('button', { name: 'Close Dialog' });
    await user.click(closeBtn);

    expect(screen.queryByTestId('mock-form-builder-dialog')).not.toBeInTheDocument();
  });

  it('renders optional title and actions toolbars and handles empty metadata fallbacks', () => {
    const emptyMetaVal = {
      ...initialValue,
      name: undefined,
      description: undefined,
    };

    render(
      <StageBuilder
        value={emptyMetaVal as any}
        onChange={vi.fn()}
        title={<div data-testid="custom-title">Custom Title</div>}
        actions={<button data-testid="custom-action">Custom Action</button>}
      />,
    );

    expect(screen.getByTestId('custom-title')).toBeInTheDocument();
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    expect(screen.getByLabelText('Form name')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('does not delete stage when confirmation is declined', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockImplementation(() => false);

    const twoStageVal: MultiStageDefinition = {
      ...initialValue,
      stages: [
        ...initialValue.stages,
        {
          id: 'stage-2',
          name: 'Stage Two',
          position: { x: 320, y: 0 },
          pages: [
            {
              id: 'page-2',
              name: 'Page Beta',
              description: '',
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          ],
        },
      ],
    };

    render(<StageBuilder value={twoStageVal} onChange={handleChange} />);

    const removeBtns = screen.getAllByRole('button', { name: 'Remove Stage' });
    await user.click(removeBtns[1]!);

    expect(confirmSpy).toHaveBeenCalled();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles page reordering, stage renaming, and relative stage insertions', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<StageBuilder value={initialValue} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Reorder Pages' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stages: expect.any(Array),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Rename Stage' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stages: [
          expect.objectContaining({
            id: 'stage-1',
            name: 'Renamed Stage',
          }),
        ],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Add After' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stages: expect.any(Array),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Add Before' }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stages: expect.any(Array),
      }),
    );
  });

  it('handles edge deletion correctly', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const modelWithEdges: MultiStageDefinition = {
      ...initialValue,
      edges: [{ id: 'edge-1', source: 'stage-1', target: 'stage-2' }],
    };

    render(<StageBuilder value={modelWithEdges} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Trigger Edge Delete' }));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        edges: [],
      }),
    );
  });

  it('covers fallback logic when stages and edges are undefined/null', () => {
    const valueWithNulls = {
      name: 'Null Meta',
      description: 'None',
      stages: undefined,
      edges: undefined,
    };
    const { unmount } = render(<StageBuilder value={valueWithNulls as any} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Form name')).toHaveValue('Null Meta');

    // Covers FitOnChange cleanup cancelAnimationFrame branch
    unmount();
  });

  it('covers FormBuilderDialog onOpenChange true branch', async () => {
    const user = userEvent.setup();
    render(<StageBuilder value={initialValue} onChange={vi.fn()} />);

    // Open FormBuilderDialog
    const editPageBtn = screen.getByRole('button', { name: 'Edit Page' });
    await user.click(editPageBtn);

    // Click Trigger Open True to invoke onOpenChange(true) -> if (!open) evaluates false
    const openTrueBtn = screen.getByRole('button', { name: 'Trigger Open True' });
    await user.click(openTrueBtn);

    expect(screen.getByTestId('mock-form-builder-dialog')).toBeInTheDocument();
  });
});
