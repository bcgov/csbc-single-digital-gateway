import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClearableInput } from '../src/jsonforms-renderers/util/clearable-input';

describe('ClearableInput', () => {
  it('shows the clear button only when the field has a value', () => {
    const { rerender } = render(<ClearableInput value="" onChange={() => {}} onClear={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    rerender(<ClearableInput value="hello" onChange={() => {}} onClear={() => {}} />);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('calls onClear when the clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ClearableInput value="hello" onChange={() => {}} onClear={onClear} />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hides the clear button when disabled even with a value', () => {
    render(<ClearableInput value="hello" disabled onChange={() => {}} onClear={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
