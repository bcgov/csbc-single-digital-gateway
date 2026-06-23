import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from '@ui/components/ui/toggle';

describe('Toggle', () => {
  it('renders as an unpressed button by default', () => {
    render(<Toggle aria-label="Bold" />);
    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles the pressed state on click', async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Bold" />);
    const toggle = screen.getByRole('button', { name: 'Bold' });

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onPressedChange with the new state', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<Toggle aria-label="Italic" onPressedChange={onPressedChange} />);

    await user.click(screen.getByRole('button', { name: 'Italic' }));

    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('respects the defaultPressed prop', () => {
    render(<Toggle aria-label="Underline" defaultPressed />);
    expect(screen.getByRole('button', { name: 'Underline' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Strike" variant="outline" disabled />);
    const toggle = screen.getByRole('button', { name: 'Strike' });

    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});
