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

describe('Inspector Component Test Suite', () => {
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
    handleChangeForm.mockClear();

    await user.type(descInput, '!');
    expect(handleChangeForm).toHaveBeenCalledWith({ description: 'Please answer accurately.!' });
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

    // Edit Field key
    const keyInput = screen.getByLabelText('Field key');
    await user.type(keyInput, '1');
    expect(handleChangeControl).toHaveBeenLastCalledWith({ key: 'username1' });

    // Edit Help text
    const helpInput = screen.getByLabelText('Help text');
    await user.type(helpInput, '?');
    expect(handleChangeControl).toHaveBeenLastCalledWith({ description: '?' });

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

  it('renders the boolean field "Display as" control and switches it to a toggle (feature 156)', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'boolean',
      key: 'agree',
      label: 'I agree',
      required: false,
      options: {},
      renderAs: 'checkbox',
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

    expect(screen.getByText('Display as')).toBeInTheDocument();
    const checkboxBtn = screen.getByRole('button', { name: 'Checkbox' });
    const toggleBtn = screen.getByRole('button', { name: 'Toggle' });
    expect(checkboxBtn).toHaveAttribute('aria-pressed', 'true');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggleBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({ renderAs: 'toggle' });
  });

  it('does not render the "Display as" control for a non-boolean field (feature 156)', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'name',
      label: 'Name',
      required: false,
      options: {},
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.queryByText('Display as')).not.toBeInTheDocument();
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
      enumOptions: [
        { value: 'red', label: 'Red Label' },
        { value: 'blue', label: 'Blue Label' },
      ],
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
      enumOptions: [
        { value: 'reds', label: 'reds' },
        { value: 'blue', label: 'Blue Label' },
      ],
    });

    // Add option
    const addBtn = screen.getByRole('button', { name: 'Add option' });
    await user.click(addBtn);
    expect(handleChangeControl).toHaveBeenLastCalledWith({
      enumOptions: [
        { value: 'red', label: 'Red Label' },
        { value: 'blue', label: 'Blue Label' },
        { value: 'option_3', label: 'Option 3' },
      ],
    });

    // Remove option
    const removeBtn = screen.getByRole('button', { name: 'Remove option 1' });
    await user.click(removeBtn);
    expect(handleChangeControl).toHaveBeenLastCalledWith({
      enumOptions: [{ value: 'blue', label: 'Blue Label' }],
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
    expect(handleChangeControl).toHaveBeenLastCalledWith({
      enumOptions: [{ value: 'v1', label: 'Label 1!' }],
    });

    // Edit value
    await user.type(valueInput, '2');
    expect(handleChangeControl).toHaveBeenLastCalledWith({
      enumOptions: [{ value: 'v12', label: 'Label 1' }],
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

    // Edit Max value
    fireEvent.change(maxInput, { target: { value: '200' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ max: 200 });

    // Edit Step value
    fireEvent.change(stepInput, { target: { value: '5' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ step: 5 });
  });

  it('renders number type, min and max settings for number field type', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'number',
      key: 'amount',
      label: 'Amount',
      required: false,
      options: {},
      numberType: 'decimal',
      min: 0,
      max: 100,
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
    expect(minInput).toHaveValue(0);
    expect(maxInput).toHaveValue(100);

    // Decimal is active; switching to Integer patches numberType.
    const decimalButton = screen.getByRole('button', { name: 'Decimal' });
    const integerButton = screen.getByRole('button', { name: 'Integer' });
    expect(decimalButton).toHaveAttribute('aria-pressed', 'true');
    expect(integerButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(integerButton);
    expect(handleChangeControl).toHaveBeenCalledWith({ numberType: 'integer' });

    // Edit Min / Max.
    fireEvent.change(minInput, { target: { value: '5' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: 5 });
    fireEvent.change(maxInput, { target: { value: '50' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ max: 50 });

    // Clearing an input removes the bound (undefined, not NaN).
    fireEvent.change(maxInput, { target: { value: '' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ max: undefined });
  });

  it('shows an error when the number field max is below its min', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'number',
      key: 'amount',
      label: 'Amount',
      required: false,
      options: {},
      numberType: 'decimal',
      min: 10,
      max: 5,
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText(/max.*must be.*min|maximum must be/i)).toBeInTheDocument();
  });

  it('shows a decimal-places control for a decimal number and edits it', () => {
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'number',
      key: 'price',
      label: 'Price',
      required: false,
      options: {},
      numberType: 'decimal',
      decimalPlaces: 2,
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

    const decimals = screen.getByLabelText('Decimal places');
    expect(decimals).toHaveValue(2);
    fireEvent.change(decimals, { target: { value: '4' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: 4 });
    // Clearing removes the limit (unbounded precision).
    fireEvent.change(decimals, { target: { value: '' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: undefined });
  });

  it('hides the decimal-places control for an integer number', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'number',
      key: 'count',
      label: 'Count',
      required: false,
      options: {},
      numberType: 'integer',
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Decimal places')).not.toBeInTheDocument();
  });

  it('defaults empty values in Container and Control inspectors when properties are omitted', () => {
    const nodeContainer: ContainerNode = {
      kind: 'container',
      layout: 'group',
      children: [],
    };

    const { rerender } = render(
      <Inspector
        node={nodeContainer}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Section title')).toHaveValue('');

    const nodeControl: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'name',
      label: 'Name',
      required: false,
      options: {},
    };

    rerender(
      <Inspector
        node={nodeControl}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Help text')).toHaveValue('');

    const nodeSlider: ControlNode = {
      kind: 'control',
      fieldType: 'slider',
      key: 'val',
      label: 'Value',
      required: false,
      options: {},
    };

    rerender(
      <Inspector
        node={nodeSlider}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Min')).toHaveValue(0);
    expect(screen.getByLabelText('Max')).toHaveValue(100);
    expect(screen.getByLabelText('Step')).toHaveValue(1);
  });

  it('shows warning message when EnumOptions list is empty', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'select',
      key: 'colors',
      label: 'Colors',
      required: false,
      options: {},
      enumOptions: [],
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Add at least one option.')).toBeInTheDocument();
  });

  it('handles missing/undefined enumOptions in EnumOptionsEditor', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'select',
      key: 'colors',
      label: 'Colors',
      required: false,
      options: {},
    };

    render(
      <Inspector
        node={node}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Add at least one option.')).toBeInTheDocument();
  });
});
