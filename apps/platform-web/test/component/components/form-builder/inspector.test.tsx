import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { Inspector } from '@/components/form-builder/inspector';
import { createField } from '@/components/form-builder/model';
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

  it('flags an empty form title as required for the inspector component', () => {
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

  it('renders a Columns input (not Section title) for a grid container (feature 169)', () => {
    const handleChangeContainer = vi.fn();
    const node: ContainerNode = {
      kind: 'container',
      layout: 'grid',
      columns: 3,
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

    expect(screen.queryByLabelText('Section title')).not.toBeInTheDocument();
    const columnsInput = screen.getByLabelText('Columns');
    expect(columnsInput).toHaveValue(3);
    expect(columnsInput).toHaveAttribute('min', '2');
    expect(columnsInput).toHaveAttribute('max', '6');

    fireEvent.change(columnsInput, { target: { value: '5' } });
    expect(handleChangeContainer).toHaveBeenLastCalledWith({ columns: 5 });

    // Out-of-range values are clamped to 2–6, not passed through raw.
    fireEvent.change(columnsInput, { target: { value: '99' } });
    expect(handleChangeContainer).toHaveBeenLastCalledWith({ columns: 6 });
    fireEvent.change(columnsInput, { target: { value: '0' } });
    expect(handleChangeContainer).toHaveBeenLastCalledWith({ columns: 2 });
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

    // Select fields also expose the opt-in Combobox switch (feature 168), off by default.
    const combobox = screen.getByRole('switch', { name: 'Combobox' });
    expect(combobox).not.toBeChecked();
    await user.click(combobox);
    expect(handleChangeControl).toHaveBeenLastCalledWith({ combobox: true });
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

const accordionNode: ControlNode = {
  kind: 'control',
  fieldType: 'accordiongroup',
  key: 'faq',
  label: 'Frequently asked questions',
  required: false,
  options: {},
  itemLabel: 'item',
  defaultOpen: 'none',
};

const renderControlInspector = (node: ControlNode, onChangeControl = vi.fn()) => {
  render(
    <Inspector
      node={node}
      allKeys={[]}
      form={{ title: '', description: '' }}
      onChangeControl={onChangeControl}
      onChangeContainer={vi.fn()}
      onChangeDisplay={vi.fn()}
      onChangeForm={vi.fn()}
    />,
  );
  return onChangeControl;
};

describe('Accordion group inspector settings (feature 171)', () => {
  it('renders the item-noun input for an accordiongroup node', () => {
    renderControlInspector(accordionNode);
    expect(screen.getByLabelText('Item noun')).toHaveValue('item');
  });

  it('emits itemLabel when the author types a noun', async () => {
    const user = userEvent.setup();
    const onChangeControl = renderControlInspector(accordionNode);

    await user.type(screen.getByLabelText('Item noun'), 's');

    expect(onChangeControl).toHaveBeenCalledWith({ itemLabel: 'items' });
  });

  it('renders the default-open control with None, First and All', () => {
    renderControlInspector(accordionNode);
    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    // "Specific item" is deliberately absent — the author never sees the filler's items.
    expect(screen.queryByRole('button', { name: /specific/i })).not.toBeInTheDocument();
  });

  it('emits defaultOpen when the author picks an option', async () => {
    const user = userEvent.setup();
    const onChangeControl = renderControlInspector(accordionNode);

    await user.click(screen.getByRole('button', { name: 'First' }));

    expect(onChangeControl).toHaveBeenCalledWith({ defaultOpen: 'first' });
  });

  it('keeps both controls controlled (createField sets them explicitly)', () => {
    // The lesson from the address read-only switches — an undefined value makes an uncontrolled input.
    const fresh = createField('accordiongroup');
    expect(fresh.itemLabel).toBe('item');
    expect(fresh.defaultOpen).toBe('none');

    renderControlInspector({ ...accordionNode, itemLabel: 'question', defaultOpen: 'all' });
    expect(screen.getByLabelText('Item noun')).toHaveValue('question');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders Min and Max item inputs, blank when unbounded', () => {
    renderControlInspector(accordionNode);
    expect(screen.getByLabelText('Min items')).toHaveValue(null);
    expect(screen.getByLabelText('Max items')).toHaveValue(null);
  });

  it('shows the authored bounds', () => {
    renderControlInspector({ ...accordionNode, minItems: 2, maxItems: 5 });
    expect(screen.getByLabelText('Min items')).toHaveValue(2);
    expect(screen.getByLabelText('Max items')).toHaveValue(5);
  });

  it('marks the field required when a minimum is entered', async () => {
    const user = userEvent.setup();
    const onChangeControl = renderControlInspector(accordionNode);

    await user.type(screen.getByLabelText('Min items'), '2');

    expect(onChangeControl).toHaveBeenCalledWith(
      expect.objectContaining({ minItems: 2, required: true }),
    );
  });

  it('does not render accordion settings for a non-accordiongroup node', () => {
    renderControlInspector({ ...accordionNode, fieldType: 'text' });
    expect(screen.queryByLabelText('Item noun')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'None' })).not.toBeInTheDocument();
  });
});

const containerNode = (overrides: Partial<ContainerNode> = {}): ContainerNode => ({
  kind: 'container',
  layout: 'section',
  children: [],
  ...overrides,
});

const renderContainerInspector = (node: ContainerNode, onChangeContainer = vi.fn()) => {
  render(
    <Inspector
      node={node}
      allKeys={[]}
      form={{ title: '', description: '' }}
      onChangeControl={vi.fn()}
      onChangeContainer={onChangeContainer}
      onChangeDisplay={vi.fn()}
      onChangeForm={vi.fn()}
    />,
  );
  return onChangeContainer;
};

describe('Section inspector settings (feature 172)', () => {
  it('renders the Section title row for a section container', () => {
    renderContainerInspector(containerNode({ label: 'Applicant details' }));
    expect(screen.getByLabelText('Section title')).toHaveValue('Applicant details');
  });

  it('renders the Description row for a section container', () => {
    renderContainerInspector(containerNode({ description: 'Tell us who you are.' }));
    expect(screen.getByLabelText('Description')).toHaveValue('Tell us who you are.');
  });

  it('emits the description when the author types one', async () => {
    const user = userEvent.setup();
    const onChangeContainer = renderContainerInspector(containerNode({ description: '' }));

    await user.type(screen.getByLabelText('Description'), 'X');

    expect(onChangeContainer).toHaveBeenCalledWith({ description: 'X' });
  });

  it('does not offer a Description row for a group container', () => {
    // Only a Section serializes options.description (doc 172, rule 10).
    renderContainerInspector(containerNode({ layout: 'group', label: 'G' }));
    expect(screen.getByLabelText('Section title')).toBeInTheDocument();
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
  });
});

describe('Inspector full branch and onClear coverage', () => {
  const defaultForm = {
    title: 'Customer Survey',
    description: 'Please answer accurately.',
  };

  it('resets copied state after timeout on FieldIdBadge', async () => {
    const user = userEvent.setup();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'testKey',
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
    const idButton = screen.getByRole('button', { name: 'Copy field ID testKey' });
    await user.click(idButton);
    expect(idButton).toHaveTextContent('Copied!');
    await waitFor(
      () => {
        expect(idButton).toHaveTextContent('ID: testKey');
      },
      { timeout: 2500 },
    );
  });

  it('supports editing option label, moving up/down, removing, out-of-bounds move, and Add option button in ChoiceOptionsEditor', () => {
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'select',
      key: 'colors',
      label: 'Color',
      required: false,
      options: {},
      enumOptions: [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
      ],
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

    // Edit Option 1 label (Line 91)
    const opt1LabelInput = screen.getByLabelText('Option 1 label');
    fireEvent.change(opt1LabelInput, { target: { value: 'Crimson' } });
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { label: 'Crimson', value: 'red' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
      ],
    });

    // Edit Option 1 value (Line 98)
    const opt1ValueInput = screen.getByLabelText('Option 1 value');
    fireEvent.change(opt1ValueInput, { target: { value: 'crimson_val' } });
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { label: 'Red', value: 'crimson_val' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
      ],
    });

    // Move Option 2 up (Line 107)
    const moveUpBtn = screen.getByRole('button', { name: 'Move option 2 up' });
    fireEvent.click(moveUpBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { label: 'Blue', value: 'blue' },
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green' },
      ],
    });

    // Out of bounds move up defensive check (Line 65)
    const moveOpt1UpBtn = screen.getByRole('button', { name: 'Move option 1 up' });
    handleChangeControl.mockClear();
    const fiberKey1 = Object.keys(moveOpt1UpBtn).find((k) => k.startsWith('__reactFiber'));
    const fiber1 = (moveOpt1UpBtn as any)[fiberKey1!];
    let fn1 = fiber1?.return?.memoizedProps?.onClick || fiber1?.memoizedProps?.onClick;
    if (typeof fn1 === 'function') fn1();
    expect(handleChangeControl).not.toHaveBeenCalled();

    // Out of bounds move down defensive check (Line 65)
    const moveOpt3DownBtn = screen.getByRole('button', { name: 'Move option 3 down' });
    handleChangeControl.mockClear();
    const fiberKey3 = Object.keys(moveOpt3DownBtn).find((k) => k.startsWith('__reactFiber'));
    const fiber3 = (moveOpt3DownBtn as any)[fiberKey3!];
    let fn3 = fiber3?.return?.memoizedProps?.onClick || fiber3?.memoizedProps?.onClick;
    if (typeof fn3 === 'function') fn3();
    expect(handleChangeControl).not.toHaveBeenCalled();

    // Move Option 2 down (Line 117)
    const moveDownBtn = screen.getByRole('button', { name: 'Move option 2 down' });
    fireEvent.click(moveDownBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green' },
        { label: 'Blue', value: 'blue' },
      ],
    });

    // Remove Option 1 (Line 126)
    const removeBtn = screen.getByRole('button', { name: 'Remove option 1' });
    fireEvent.click(removeBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
      ],
    });

    // Add option button (Line 140)
    const addBtn = screen.getByRole('button', { name: 'Add option' });
    fireEvent.click(addBtn);
    expect(handleChangeControl).toHaveBeenCalledWith({
      enumOptions: [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
        { label: 'Option 4', value: 'option_4' },
      ],
    });
  });

  it('handles onClear for placeholder, mask, maxLength, label, and parsePositiveInt in TextSettings/ControlInspector', () => {
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'text',
      key: 'name',
      label: 'Full Name',
      placeholder: 'John Doe',
      mask: '(999) 999-9999',
      maxLength: 50,
      multiline: false,
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

    // Clear Label (Line 346)
    const labelInput = screen.getByLabelText('Label');
    const labelClear = labelInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(labelClear).toBeTruthy();
    fireEvent.click(labelClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ label: '' });

    // Clear Placeholder (Line 291)
    const placeholderInput = screen.getByLabelText('Placeholder');
    const placeholderClear = placeholderInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(placeholderClear).toBeTruthy();
    fireEvent.click(placeholderClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ placeholder: '' });

    // Clear Mask (Line 310)
    const maskInput = screen.getByLabelText('Input mask');
    const maskClear = maskInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(maskClear).toBeTruthy();
    fireEvent.click(maskClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ mask: '' });

    // Clear Max length (Line 324)
    const maxLenInput = screen.getByLabelText('Max length');
    const maxLenClear = maxLenInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(maxLenClear).toBeTruthy();
    fireEvent.click(maxLenClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ maxLength: undefined });

    // parsePositiveInt tests
    fireEvent.change(maxLenInput, { target: { value: '' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ maxLength: undefined });
    fireEvent.change(maxLenInput, { target: { value: '0' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ maxLength: undefined });
    fireEvent.change(maxLenInput, { target: { value: '100' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ maxLength: 100 });
  });

  it('handles NumberSettings onClear, parseBound, parseDecimals, and boundsInverted', () => {
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'number',
      key: 'age',
      label: 'Age',
      numberType: 'decimal',
      min: 10,
      max: 5,
      decimalPlaces: 2,
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

    // Inverted bounds warning
    expect(screen.getByText('Max must be greater than or equal to Min.')).toBeInTheDocument();

    // Clear Minimum (Line 219)
    const minInput = screen.getByLabelText('Min');
    const minClear = minInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(minClear).toBeTruthy();
    fireEvent.click(minClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ min: undefined });

    // Clear Maximum (Line 229)
    const maxInput = screen.getByLabelText('Max');
    const maxClear = maxInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(maxClear).toBeTruthy();
    fireEvent.click(maxClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ max: undefined });

    // Clear Decimal places (Line 208)
    const decInput = screen.getByLabelText('Decimal places');
    const decClear = decInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(decClear).toBeTruthy();
    fireEvent.click(decClear!);
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: undefined });

    // parseBound tests: empty string, NaN, 1e999, valid number
    fireEvent.change(minInput, { target: { value: '' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: undefined });
    const minProps = (minInput as any)[
      Object.keys(minInput).find((k) => k.startsWith('__reactProps'))!
    ];
    minProps?.onChange({
      target: { value: 'not-a-number' },
      currentTarget: { value: 'not-a-number' },
    });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: undefined });
    minProps?.onChange({ target: { value: '1e999' }, currentTarget: { value: '1e999' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: Infinity });
    fireEvent.change(minInput, { target: { value: '18' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: 18 });

    // parseDecimals tests: empty string, NaN, negative, valid integer
    fireEvent.change(decInput, { target: { value: '' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: undefined });
    const decProps = (decInput as any)[
      Object.keys(decInput).find((k) => k.startsWith('__reactProps'))!
    ];
    decProps?.onChange({ target: { value: 'not-an-int' }, currentTarget: { value: 'not-an-int' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: undefined });
    decProps?.onChange({ target: { value: '-1' }, currentTarget: { value: '-1' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: undefined });
    fireEvent.change(decInput, { target: { value: '10' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: 10 });
    fireEvent.change(decInput, { target: { value: '3' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ decimalPlaces: 3 });
  });

  it('covers fallbacks for numberType and renderAs, required toggle on accordiongroup, and address fieldType', () => {
    const handleChangeControl = vi.fn();

    // 1. numberType fallback to 'decimal'
    const numberNode: ControlNode = {
      kind: 'control',
      fieldType: 'number',
      key: 'numField',
      label: 'Num',
      required: false,
      options: {},
    };
    const { unmount: unmountNum } = render(
      <Inspector
        node={numberNode}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Decimal places')).toBeInTheDocument();
    unmountNum();

    // 2. renderAs fallback to 'checkbox'
    const boolNode: ControlNode = {
      kind: 'control',
      fieldType: 'boolean',
      key: 'boolField',
      label: 'Bool',
      required: false,
      options: {},
    };
    const { unmount: unmountBool } = render(
      <Inspector
        node={boolNode}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Checkbox' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    unmountBool();

    // 3. Required toggle on accordiongroup
    const accordionGroupNode: ControlNode = {
      kind: 'control',
      fieldType: 'accordiongroup',
      key: 'accField',
      label: 'Accordion',
      required: false,
      options: {},
    };
    const { unmount: unmountAcc } = render(
      <Inspector
        node={accordionGroupNode}
        form={defaultForm}
        onChangeControl={handleChangeControl}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );
    const reqSwitch = screen.getByRole('switch', { name: 'Required' });
    fireEvent.click(reqSwitch);
    expect(handleChangeControl).toHaveBeenCalledWith(expect.objectContaining({ required: true }));
    unmountAcc();

    // 4. Address fieldType renders AddressDefaultsEditor
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const addressNode: ControlNode = {
      kind: 'control',
      fieldType: 'address',
      key: 'addrField',
      label: 'Address',
      required: false,
      options: {},
    };
    render(
      <QueryClientProvider client={queryClient}>
        <Inspector
          node={addressNode}
          form={defaultForm}
          onChangeControl={handleChangeControl}
          onChangeContainer={vi.fn()}
          onChangeDisplay={vi.fn()}
          onChangeForm={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Default country')).toBeInTheDocument();
  });

  it('handles Slider settings in ControlInspector', () => {
    const handleChangeControl = vi.fn();
    const node: ControlNode = {
      kind: 'control',
      fieldType: 'slider',
      key: 'volume',
      label: 'Volume',
      min: 10,
      max: 90,
      step: 5,
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

    const minInput = screen.getByLabelText('Min');
    const maxInput = screen.getByLabelText('Max');
    const stepInput = screen.getByLabelText('Step');

    fireEvent.change(minInput, { target: { value: '0' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ min: 0 });

    fireEvent.change(maxInput, { target: { value: '100' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ max: 100 });

    fireEvent.change(stepInput, { target: { value: '1' } });
    expect(handleChangeControl).toHaveBeenCalledWith({ step: 1 });
  });

  it('handles onClear for form title in form settings', () => {
    const handleChangeForm = vi.fn();
    render(
      <Inspector
        node={null}
        form={{ title: 'My Form', description: 'Desc' }}
        onChangeControl={vi.fn()}
        onChangeContainer={vi.fn()}
        onChangeDisplay={vi.fn()}
        onChangeForm={handleChangeForm}
      />,
    );

    // Clear Title (Line 470)
    const titleInput = screen.getByLabelText('Title');
    const clearBtn = titleInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn!);
    expect(handleChangeForm).toHaveBeenCalledWith({ title: '' });
  });

  it('handles onClear for container section title and covers grid fallback values', () => {
    const handleChangeContainer = vi.fn();
    const node: ContainerNode = {
      kind: 'container',
      layout: 'section',
      label: 'Personal Info',
      description: 'Please fill in details',
      children: [],
    };

    const { unmount } = render(
      <Inspector
        node={node}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={handleChangeContainer}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    // Clear Section title (Line 514)
    const titleInput = screen.getByLabelText('Section title');
    const clearBtn = titleInput
      .closest('.group\\/input-group')
      ?.querySelector('button[aria-label="Clear"]');
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn!);
    expect(handleChangeContainer).toHaveBeenCalledWith({ label: '' });

    unmount();

    // Grid container with columns fallback (Line 498 & 500)
    const gridNode: ContainerNode = {
      kind: 'container',
      layout: 'grid',
      children: [],
    };
    render(
      <Inspector
        node={gridNode}
        form={defaultForm}
        onChangeControl={vi.fn()}
        onChangeContainer={handleChangeContainer}
        onChangeDisplay={vi.fn()}
        onChangeForm={vi.fn()}
      />,
    );

    const colsInput = screen.getByLabelText('Columns');
    expect(colsInput).toHaveValue(2); // fallback columns ?? 2

    // Invalid value falls back to 2 in onChange
    fireEvent.change(colsInput, { target: { value: 'invalid' } });
    expect(handleChangeContainer).toHaveBeenCalledWith({ columns: 2 });
  });
});
