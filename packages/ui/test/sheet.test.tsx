import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function TestSheet() {
  return (
    <Sheet>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit settings</SheetTitle>
          <SheetDescription>Update your preferences here.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose>Cancel</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('does not render the sheet content until the trigger is activated', () => {
    render(<TestSheet />);
    expect(screen.getByRole('button', { name: 'Open sheet' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the sheet with an accessible name when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);

    await user.click(screen.getByRole('button', { name: 'Open sheet' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName('Edit settings');
    expect(within(dialog).getByText('Update your preferences here.')).toBeInTheDocument();
  });

  it('closes the sheet when the close control is activated', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);

    await user.click(screen.getByRole('button', { name: 'Open sheet' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await screen.findByRole('button', { name: 'Open sheet' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a default close button inside the content', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);

    await user.click(screen.getByRole('button', { name: 'Open sheet' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
