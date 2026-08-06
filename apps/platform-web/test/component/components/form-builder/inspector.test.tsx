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

  it('flags an empty form title as required', () => {
    render(
      <Inspector
        node={null}
        form={{ title: '', description: '' }}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    expect(screen.getByText('A title is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
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

  it('renders control inspector with basic settings; no editable field key (feature 159)', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'V1StGXR8',
      label: 'Username',
      required: false,
      options: {},
    };

    render(
      <Inspector
        node={node}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    expect(screen.getByText('Field settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toHaveValue('Username');
    // No editable "Field key" input anymore — the key is auto-generated.
    expect(screen.queryByLabelText('Field key')).not.toBeInTheDocument();

    // Edit Label
    await user.type(screen.getByLabelText('Label'), '!');
    expect(handleChangeControl).toHaveBeenCalledWith({ label: 'Username!' });

    // Field description (was "Help text")
    const descInput = screen.getByLabelText('Field description');
    await user.type(descInput, '?');
    expect(handleChangeControl).toHaveBeenLastCalledWith({ description: '?' });

    // Toggle required
    const requiredSwitch = screen.getByRole('switch', { name: 'Required' });
    expect(requiredSwitch).not.toBeChecked();
    await user.click(requiredSwitch);
    expect(handleChangeControl).toHaveBeenCalledWith({ required: true });
  });

  it('flags an empty field label as required (feature 159)', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'V1StGXR8',
      label: '',
      required: true,
      options: {},
    };
    render(
      <Inspector
        node={node}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    expect(screen.getByText('A label is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a muted, click-to-copy field ID for a control field (feature 159)', async () => {
    const user = userEvent.setup(); // installs a clipboard stub (jsdom's is getter-only)
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'V1StGXR8',
      label: 'Username',
      required: false,
      options: {},
    };

    render(
      <Inspector
        node={node}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    const idButton = screen.getByRole('button', { name: 'Copy field ID V1StGXR8' });
    expect(idButton).toHaveTextContent('ID: V1StGXR8');
    await user.click(idButton);
    expect(await navigator.clipboard.readText()).toBe('V1StGXR8');
    expect(idButton).toHaveTextContent('Copied!');
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

  it('renders the choice options editor and edits value/label independently (feature 156 Step 2)', async () => {
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

    // Edit option value — label is now independent of the value (feature 156 Step 2).
    const optionInput = screen.getByLabelText('Option 1 value');
    expect(optionInput).toHaveValue('red');
    await user.type(optionInput, 's');

    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { value: 'reds', label: 'Red Label' },
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

  it('renders value + label inputs for every choice field (radio) — feature 156 Step 2', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'radio',
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

    // Both a value and a label input exist for a radio field too (not just the old oneof).
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

  it('reorders choice options and toggles the Select "Allow multiple" switch (feature 156 Step 2)', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'select',
      key: 'colors',
      label: 'Colors',
      required: false,
      options: {},
      multiple: false,
      enumOptions: [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
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

    // Move option 1 down swaps the two options (order is the citizen-facing order).
    await user.click(screen.getByRole('button', { name: 'Move option 1 down' }));
    expect(handleChangeControl).toHaveBeenLastCalledWith({
      enumOptions: [
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
      ],
    });
    // First option can't move up; last can't move down.
    expect(screen.getByRole('button', { name: 'Move option 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move option 2 down' })).toBeDisabled();

    // Select fields expose a single/multi switch.
    const multiple = screen.getByRole('switch', { name: 'Allow multiple' });
    expect(multiple).not.toBeChecked();
    await user.click(multiple);
    expect(handleChangeControl).toHaveBeenLastCalledWith({ multiple: true });
  });

  it('renders text field settings: placeholder, multiline and max length (feature 158)', async () => {
    const user = userEvent.setup();
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'bio',
      label: 'Bio',
      required: false,
      options: {},
      multiline: false,
    };

    const { rerender } = render(
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

    fireEvent.change(screen.getByLabelText('Placeholder'), { target: { value: 'Tell us' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ placeholder: 'Tell us' });

    fireEvent.change(screen.getByLabelText('Max length'), { target: { value: '280' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ maxLength: 280 });

    // Single-line shows the input mask; editing it fires onChange.
    fireEvent.change(screen.getByLabelText('Input mask'), { target: { value: '(999) 999-9999' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ mask: '(999) 999-9999' });

    // No author-set rows anymore — multiline is a plain on/off toggle.
    expect(screen.queryByLabelText('Visible rows')).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Multiline' }));
    expect(handleChangeControl).toHaveBeenCalledWith({ multiline: true });

    // The input mask is single-line only — hidden once multiline is on.
    rerender(
      <Inspector
        node={{ ...node, multiline: true }}
        allKeys={[]}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Input mask')).not.toBeInTheDocument();
  });

  it('orders each choice option Label-then-Value inside a capped scroll list (feature 156 Step 2)', () => {
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'checkboxes',
      key: 'colors',
      label: 'Colors',
      required: false,
      options: {},
      enumOptions: Array.from({ length: 6 }, (_, i) => ({
        value: `v${i + 1}`,
        label: `Label ${i + 1}`,
      })),
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

    // The Label input precedes the Value input for each option.
    const firstLabel = screen.getByLabelText('Option 1 label');
    const firstValue = screen.getByLabelText('Option 1 value');
    expect(
      firstLabel.compareDocumentPosition(firstValue) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // The options live in a height-capped, scrollable container (≈5 rows before scrolling).
    const scroller = firstLabel.closest('.overflow-y-auto');
    expect(scroller).not.toBeNull();
    expect(scroller?.className).toContain('max-h-');
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

    expect(screen.getByLabelText('Field description')).toHaveValue('');

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
