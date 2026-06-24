import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@ui/components/ui/popover';

function TestPopover() {
  return (
    <Popover>
      <PopoverTrigger>Open popover</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
          <PopoverDescription>Adjust your preferences.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

describe('Popover', () => {
  it('renders the trigger and keeps the content closed initially', () => {
    render(<TestPopover />);
    expect(screen.getByRole('button', { name: 'Open popover' })).toBeInTheDocument();
    expect(screen.queryByText('Adjust your preferences.')).not.toBeInTheDocument();
  });

  it('opens the popover content when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(screen.getByRole('button', { name: 'Open popover' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Settings')).toBeInTheDocument();
    expect(within(dialog).getByText('Adjust your preferences.')).toBeInTheDocument();
  });

  it('toggles the open state via the trigger aria-expanded attribute', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    const trigger = screen.getByRole('button', { name: 'Open popover' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    await screen.findByRole('dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the popover when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(screen.getByRole('button', { name: 'Open popover' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
