import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NotificationsMenu } from '@/components/console/notifications-menu';

describe('NotificationsMenu', () => {
  it('renders disabled trigger when disabled prop is true', () => {
    render(<NotificationsMenu disabled={true} />);

    const triggerBtn = screen.getByRole('button', { name: 'Notifications' });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).toBeDisabled();
    expect(screen.queryByText('You’re all caught up.')).not.toBeInTheDocument();
  });

  it('renders enabled trigger by default', () => {
    render(<NotificationsMenu />);

    const triggerBtn = screen.getByRole('button', { name: 'Notifications' });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).not.toBeDisabled();
  });

  it('opens dropdown menu showing caught up notification message when clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationsMenu />);

    const triggerBtn = screen.getByRole('button', { name: 'Notifications' });
    await user.click(triggerBtn);

    // Verify Dropdown menu header title and status message
    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('You’re all caught up.')).toBeInTheDocument();
  });
});
