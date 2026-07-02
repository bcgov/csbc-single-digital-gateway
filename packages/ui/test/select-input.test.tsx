import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelectInput } from '@ui/inputs/select-input';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
];

// react-select is jsdom-hostile for interaction (portalled menu, focus), so this
// covers render-safety + a11y + the value→option resolution, not menu clicks.
describe('SelectInput', () => {
  it('renders a combobox with the placeholder', () => {
    render(
      <SelectInput
        value={undefined}
        onChange={() => {}}
        options={options}
        placeholder="Pick one"
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('shows the selected option label for a bound value', () => {
    render(<SelectInput value="b" onChange={() => {}} options={options} />);
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('renders each selected label in multi mode', () => {
    render(<SelectInput value={['a', 'b']} onChange={() => {}} options={options} isMulti />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });
});
