import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch } from '@ui/components/ui/switch';

describe('Switch', () => {
  it('renders an unchecked switch by default', () => {
    render(<Switch aria-label="Notifications" />);

    const sw = screen.getByRole('switch', { name: 'Notifications' });
    expect(sw).toBeInTheDocument();
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles checked state when clicked', async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Notifications" />);

    const sw = screen.getByRole('switch', { name: 'Notifications' });
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');

    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('respects the defaultChecked prop', () => {
    render(<Switch aria-label="Wifi" defaultChecked />);

    expect(screen.getByRole('switch', { name: 'Wifi' })).toHaveAttribute('aria-checked', 'true');
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Bluetooth" disabled />);

    const sw = screen.getByRole('switch', { name: 'Bluetooth' });
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });
});
