import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '@ui/components/ui/checkbox';

describe('Checkbox', () => {
  it('renders an accessible checkbox', () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
  });

  it('is unchecked by default', () => {
    render(<Checkbox aria-label="Subscribe" />);
    expect(screen.getByRole('checkbox', { name: 'Subscribe' })).not.toBeChecked();
  });

  it('toggles to checked when clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Subscribe" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('toggles back to unchecked on a second click', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Toggle" defaultChecked />);
    const checkbox = screen.getByRole('checkbox', { name: 'Toggle' });
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('fires onCheckedChange with the new state', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Notify" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole('checkbox', { name: 'Notify' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Locked" disabled />);
    const checkbox = screen.getByRole('checkbox', { name: 'Locked' });
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
