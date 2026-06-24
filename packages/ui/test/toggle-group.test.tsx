import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToggleGroup, ToggleGroupItem } from '@ui/components/ui/toggle-group';

function SingleGroup() {
  return (
    <ToggleGroup defaultValue={['left']}>
      <ToggleGroupItem value="left" aria-label="Align left">
        L
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Align center">
        C
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Align right">
        R
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function MultipleGroup() {
  return (
    <ToggleGroup multiple defaultValue={['bold']}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        B
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        I
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

describe('ToggleGroup', () => {
  it('renders each item as a toggle button reflecting the default value', () => {
    render(<SingleGroup />);
    expect(screen.getByRole('button', { name: 'Align left' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Align center' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('allows only one item pressed in single-selection mode', async () => {
    const user = userEvent.setup();
    render(<SingleGroup />);

    await user.click(screen.getByRole('button', { name: 'Align center' }));

    expect(screen.getByRole('button', { name: 'Align center' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Align left' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('keeps multiple items pressed in multiple-selection mode', async () => {
    const user = userEvent.setup();
    render(<MultipleGroup />);

    await user.click(screen.getByRole('button', { name: 'Italic' }));

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('unpresses an active item when clicked again', async () => {
    const user = userEvent.setup();
    render(<MultipleGroup />);

    await user.click(screen.getByRole('button', { name: 'Bold' }));

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');
  });
});
