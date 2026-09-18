import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
} from '@ui/components/ui/combobox';

const items = ['Apple', 'Banana', 'Cherry'];

function TestCombobox() {
  return (
    <Combobox items={items}>
      <ComboboxInput placeholder="Pick a fruit" />
      <ComboboxContent>
        <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        {/* `ComboboxList`'s children MUST be the render-prop form, not a static `.map()` — Base UI
            calls this function only for the currently filtered items; a static map always renders
            every item regardless of the typed query (see the "filters" test below). */}
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
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

  it('filters the option list as the query changes (regression: requires the render-prop List form)', async () => {
    const user = userEvent.setup();
    render(<TestCombobox />);
    const input = screen.getByPlaceholderText('Pick a fruit');
    await user.click(input);
    await user.type(input, 'Ban');
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Banana' })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: 'Apple' })).not.toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: 'Cherry' })).not.toBeInTheDocument();
  });

  it('labels the chip remove button via removeLabel (feature 168)', () => {
    render(
      <Combobox items={items} multiple value={['Apple']}>
        <ComboboxChips>
          <ComboboxChip removeLabel="Remove Apple">Apple</ComboboxChip>
        </ComboboxChips>
      </Combobox>,
    );
    expect(screen.getByRole('button', { name: 'Remove Apple' })).toBeInTheDocument();
  });

  it('renders the chip remove button with no accessible name when removeLabel is omitted', () => {
    render(
      <Combobox items={items} multiple value={['Apple']}>
        <ComboboxChips>
          <ComboboxChip>Apple</ComboboxChip>
        </ComboboxChips>
      </Combobox>,
    );
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
  });

  it('gives the chips box the same unavailable fill the single-select gets (doc 205)', () => {
    // The chips box IS the multi-select's input surface, so a disabled field must read as unavailable there
    // too — it was white while the single-select went grey. CSS `:read-only` matches a DISABLED input as
    // well as a readonly one, which is why one rule covers both, exactly as InputGroup does it.
    render(
      <Combobox items={items} multiple value={[]}>
        <ComboboxChips>
          <ComboboxChipsInput disabled />
        </ComboboxChips>
      </Combobox>,
    );
    const chips = document.querySelector('[data-slot="combobox-chips"]');
    expect(chips).toHaveClass('has-[[data-slot=combobox-chip-input]:read-only]:bg-input/50');
    expect(chips).toHaveClass('bg-input-background');
  });

  it('labels the input clear button via clearLabel and clears the selection when clicked', async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={items} value="Apple">
        <ComboboxInput placeholder="Pick a fruit" showClear clearLabel="Clear" />
      </Combobox>,
    );
    expect(screen.getByPlaceholderText('Pick a fruit')).toHaveValue('Apple');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByPlaceholderText('Pick a fruit')).toHaveValue('');
  });
});
