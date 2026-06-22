import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
} from '@/components/ui/combobox';

const items = ['Apple', 'Banana', 'Cherry'];

function TestCombobox() {
  return (
    <Combobox items={items}>
      <ComboboxInput placeholder="Pick a fruit" />
      <ComboboxContent>
        <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        <ComboboxList>
          <ComboboxGroup>
            <ComboboxLabel>Fruit</ComboboxLabel>
            {items.map((item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            ))}
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

describe('Combobox', () => {
  it('mounts the full structure without throwing', () => {
    expect(() => render(<TestCombobox />)).not.toThrow();
  });

  it('exposes all expected exports', () => {
    expect(Combobox).toBeDefined();
    expect(ComboboxInput).toBeDefined();
    expect(ComboboxContent).toBeDefined();
    expect(ComboboxList).toBeDefined();
    expect(ComboboxItem).toBeDefined();
    expect(ComboboxGroup).toBeDefined();
    expect(ComboboxLabel).toBeDefined();
    expect(ComboboxEmpty).toBeDefined();
    expect(ComboboxValue).toBeDefined();
  });

  it('renders the input control with its placeholder', () => {
    render(<TestCombobox />);
    expect(screen.getByPlaceholderText('Pick a fruit')).toBeInTheDocument();
  });

  it('keeps the listbox closed until interacted with', () => {
    render(<TestCombobox />);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
