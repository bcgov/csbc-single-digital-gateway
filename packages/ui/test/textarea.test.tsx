import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from '@ui/components/ui/textarea';

describe('Textarea', () => {
  it('renders an accessible textbox', () => {
    render(<Textarea aria-label="Bio" />);
    expect(screen.getByRole('textbox', { name: 'Bio' })).toBeInTheDocument();
  });

  it('updates its value as the user types', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notes" />);
    const textarea = screen.getByRole('textbox', { name: 'Notes' });

    await user.type(textarea, 'hello world');

    expect(textarea).toHaveValue('hello world');
  });

  it('renders a placeholder when provided', () => {
    render(<Textarea aria-label="Comment" placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('does not accept input when disabled', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Locked" disabled />);
    const textarea = screen.getByRole('textbox', { name: 'Locked' });

    expect(textarea).toBeDisabled();
    await user.type(textarea, 'nope');
    expect(textarea).toHaveValue('');
  });
});
