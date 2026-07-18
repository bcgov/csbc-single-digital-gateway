import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Inspector } from '@/components/form-builder/inspector';
import type { ContainerNode, ControlNode, DisplayNode } from '@/components/form-builder/model';

// Mock DisplayInspector
vi.mock('@/components/form-builder/display-inspector', () => ({
  DisplayInspector: ({ node, onChange }: any) => (
    <div data-testid="mock-display-inspector">
      Mock DisplayInspector: {node.displayType}
      <button onClick={() => onChange({ text: 'updated display text' })}>Change Display</button>
    </div>
  ),
}));

describe('Inspector', () => {
  const defaultForm = {
    title: 'Customer Survey',
    description: 'Please answer accurately.',
  };

  it('renders form-level settings when node is null', async () => {
    const user = userEvent.setup();
    const handleChangeForm = vi.fn();

    render(
      <Inspector
        node={null}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={handleChangeForm}
      />,
    );

    expect(screen.getByText('Form settings')).toBeInTheDocument();

    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toHaveValue('Customer Survey');

    const descInput = screen.getByLabelText('Description');
    expect(descInput).toHaveValue('Please answer accurately.');

    // Edit form metadata
    await user.type(titleInput, '!');
    expect(handleChangeForm).toHaveBeenCalledWith({ title: 'Customer Survey!' });
  });

  it('renders container settings when node is a ContainerNode', async () => {
    const user = userEvent.setup();
    const handleChangeContainer = vi.fn();
    const node: ContainerNode = {
      kind: 'container',
      layout: 'horizontal',
      label: 'Main Section',
      children: [],
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={handleChangeContainer}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Section')).toBeInTheDocument();

    const sectionInput = screen.getByLabelText('Section title');
    expect(sectionInput).toHaveValue('Main Section');

    // Edit container label
    await user.type(sectionInput, '!');
    expect(handleChangeContainer).toHaveBeenCalledWith({ label: 'Main Section!' });
  });

  it('renders display inspector when node is a DisplayNode', () => {
    const handleChangeDisplay = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'disp-1',
      displayType: 'heading',
      text: 'My Heading',
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={handleChangeDisplay}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-display-inspector')).toBeInTheDocument();
    expect(screen.getByText('Mock DisplayInspector: heading')).toBeInTheDocument();

    // Trigger change inside mock display inspector
    const changeBtn = screen.getByRole('button', { name: 'Change Display' });
    fireEvent.click(changeBtn);
    expect(handleChangeDisplay).toHaveBeenCalledWith({ text: 'updated display text' });
  });

  it('renders control inspector with basic settings and duplicate key warnings', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'username',
      label: 'Username',
      required: false,
      options: {},
    };

    const { rerender } = render(
      <Inspector
        node={node}
        allKeys={['username']} // No duplicate key
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Field settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toHaveValue('Username');
    expect(screen.getByLabelText('Field key')).toHaveValue('username');
    expect(screen.queryByText('Another field already uses this key.')).not.toBeInTheDocument();

    // Edit Label
    await user.type(screen.getByLabelText('Label'), '!');
    expect(handleChangeControl).toHaveBeenCalledWith({ label: 'Username!' });

    // Toggle required
    const requiredSwitch = screen.getByRole('switch', { name: 'Required' });
    expect(requiredSwitch).not.toBeChecked();
    await user.click(requiredSwitch);
    expect(handleChangeControl).toHaveBeenCalledWith({ required: true });

    // Rerender with duplicate keys
    rerender(
      <Inspector
        node={node}
        allKeys={['username', 'username']} // Duplicate key
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    expect(screen.getByText('Another field already uses this key.')).toBeInTheDocument();
  });

  it('renders options editor for enum fields and edits value-only option properties', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'select',
      key: 'colors',
      label: 'Colors',
      required: false,
      options: {},
      enumOptions: [{ value: 'red', label: 'Red Label' }],
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Options')).toBeInTheDocument();

    // Edit option value
    const optionInput = screen.getByLabelText('Option 1 value');
    expect(optionInput).toHaveValue('red');
    await user.type(optionInput, 's');

    // For value-only field (select), value change propagates identical value to label
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [{ value: 'reds', label: 'reds' }],
    });

    // Add option
    const addBtn = screen.getByRole('button', { name: 'Add option' });
    await user.click(addBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { value: 'red', label: 'Red Label' },
        { value: 'option_2', label: 'Option 2' },
      ],
    });

    // Remove option
    const removeBtn = screen.getByRole('button', { name: 'Remove option 1' });
    await user.click(removeBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [],
    });
  });

  it('renders options editor with label inputs for oneof fields', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'oneof', // with labels
      key: 'options',
      label: 'Options List',
      required: false,
      options: {},
      enumOptions: [{ value: 'v1', label: 'Label 1' }],
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    // Option value and option label inputs should exist for oneof fields
    const valueInput = screen.getByLabelText('Option 1 value');
    const labelInput = screen.getByLabelText('Option 1 label');
    expect(valueInput).toHaveValue('v1');
    expect(labelInput).toHaveValue('Label 1');

    // Edit label only
    await user.type(labelInput, '!');
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [{ value: 'v1', label: 'Label 1!' }],
    });
  });

  it('renders slider config settings for slider field type', async () => {
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'slider',
      key: 'percentage',
      label: 'Percentage',
      required: false,
      options: {},
      min: 0,
      max: 100,
      step: 10,
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    const minInput = screen.getByLabelText('Min');
    const maxInput = screen.getByLabelText('Max');
    const stepInput = screen.getByLabelText('Step');

    expect(minInput).toHaveValue(0);
    expect(maxInput).toHaveValue(100);
    expect(stepInput).toHaveValue(10);

    // Edit Min value
    fireEvent.change(minInput, { target: { value: '10' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: 10 });
  });
});
