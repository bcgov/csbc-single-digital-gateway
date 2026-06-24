import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@ui/components/ui/command';

function TestCommand() {
  return (
    <Command>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            Calendar
            <CommandShortcut>⌘C</CommandShortcut>
          </CommandItem>
          <CommandItem>Search</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>Profile</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe('Command', () => {
  it('mounts the full structure without throwing', () => {
    expect(() => render(<TestCommand />)).not.toThrow();
  });

  it('exposes all expected exports', () => {
    expect(Command).toBeDefined();
    expect(CommandInput).toBeDefined();
    expect(CommandList).toBeDefined();
    expect(CommandEmpty).toBeDefined();
    expect(CommandGroup).toBeDefined();
    expect(CommandItem).toBeDefined();
    expect(CommandSeparator).toBeDefined();
    expect(CommandShortcut).toBeDefined();
  });

  it('renders a searchable combobox-style input', () => {
    render(<TestCommand />);
    const input = screen.getByPlaceholderText('Type a command...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('role', 'combobox');
  });

  it('renders the command items and groups', () => {
    render(<TestCommand />);
    const list = screen.getByRole('listbox');
    expect(within(list).getByText('Calendar')).toBeInTheDocument();
    expect(within(list).getByText('Search')).toBeInTheDocument();
    expect(within(list).getByText('Profile')).toBeInTheDocument();
  });
});
