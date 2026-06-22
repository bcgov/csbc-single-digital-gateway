import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function TestSelect() {
  return (
    <Select>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe('Select', () => {
  it('renders a combobox trigger with the placeholder and no open listbox', () => {
    render(<TestSelect />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Pick a fruit');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the listbox with its options when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);

    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Cherry' })).toBeInTheDocument();
  });

  it('selects an option and reflects the chosen value on the trigger', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);

    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    await screen.findByRole('listbox');
    await user.click(screen.getByRole('option', { name: 'Banana' }));

    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger).toHaveTextContent(/banana/i);
    expect(trigger).not.toHaveTextContent('Pick a fruit');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('fires onValueChange with the selected value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>,
    );

    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    await screen.findByRole('listbox');
    await user.click(screen.getByRole('option', { name: 'Apple' }));

    expect(onValueChange).toHaveBeenCalledWith('apple', expect.anything());
  });
});
