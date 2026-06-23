import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '@ui/components/ui/input';

describe('Input', () => {
  it('renders a textbox with its data-slot', () => {
    render(<Input aria-label="search" />);
    const input = screen.getByRole('textbox', { name: 'search' });
    expect(input).toHaveAttribute('data-slot', 'input');
  });

  it('updates its value when the user types', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="username" />);
    const input = screen.getByRole('textbox', { name: 'username' });
    await user.type(input, 'sidmclaughlin');
    expect(input).toHaveValue('sidmclaughlin');
  });

  it('does not accept input when disabled', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="locked" disabled />);
    const input = screen.getByRole('textbox', { name: 'locked' });
    expect(input).toBeDisabled();
    await user.type(input, 'nope');
    expect(input).toHaveValue('');
  });

  it('forwards type and placeholder props', () => {
    render(<Input type="email" placeholder="you@example.com" aria-label="email" />);
    const input = screen.getByRole('textbox', { name: 'email' });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('reflects aria-invalid for error styling hooks', () => {
    render(<Input aria-label="bad" aria-invalid />);
    expect(screen.getByRole('textbox', { name: 'bad' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('merges a custom className', () => {
    render(<Input aria-label="styled" className="custom-marker" />);
    expect(screen.getByRole('textbox', { name: 'styled' }).className).toContain('custom-marker');
  });
});
