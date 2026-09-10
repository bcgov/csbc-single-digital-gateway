import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from '@ui/inputs/number-input';

// Doc 182 rules 1-6 — NumberInput (Base UI NumberField Root + Input, flat props).

describe('NumberInput', () => {
  it('renders a number-input root wrapping a number-input-input textbox', () => {
    const { container } = render(<NumberInput aria-label="Quantity" />);
    const input = screen.getByRole('textbox', { name: 'Quantity' });
    const root = container.querySelector('[data-slot="number-input"]');

    expect(input).toHaveAttribute('data-slot', 'number-input-input');
    expect(root).toContainElement(input);
    expect(root?.getAttribute('class')).toBeNull();
  });

  it('routes className, placeholder and aria-* to the input, not the root', () => {
    const { container } = render(
      <NumberInput
        aria-label="Quantity"
        aria-invalid
        aria-describedby="hint"
        placeholder="0"
        className="custom-marker"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Quantity' });
    const root = container.querySelector<HTMLElement>('[data-slot="number-input"]');

    expect(input).toHaveAttribute('placeholder', '0');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'hint');
    expect(input.className).toContain('custom-marker');
    expect(root?.className ?? '').not.toContain('custom-marker');
    expect(root).not.toHaveAttribute('placeholder');
  });

  it("carries Input's styling hooks", () => {
    render(<NumberInput aria-label="Quantity" />);
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveClass(
      'border-input',
      'bg-input-background',
      'aria-invalid:border-destructive',
      'disabled:opacity-50',
    );
  });

  it('puts id on the input so a <label htmlFor> names it', () => {
    render(
      <>
        <label htmlFor="qty">Quantity</label>
        <NumberInput id="qty" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveAttribute('id', 'qty');
  });

  it('emits numbers through onValueChange as the user types, and null when cleared', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Quantity" onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Quantity' });

    await user.type(input, '42');
    expect(onValueChange).toHaveBeenLastCalledWith(42, expect.anything());

    await user.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.anything());
  });

  it('steps with the arrow keys by step and clamps to max', async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="Quantity" defaultValue={8} step={5} max={10} />);
    const input = screen.getByRole('textbox', { name: 'Quantity' });

    await user.click(input);
    await user.keyboard('{ArrowUp}');

    expect(input).toHaveValue('10');
  });

  it('displays the value with the given format and locale', () => {
    render(
      <NumberInput
        aria-label="Budget"
        value={1234.5}
        format={{ style: 'currency', currency: 'CAD' }}
        locale="en-CA"
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Budget' })).toHaveValue('$1,234.50');
  });

  it('disables the input when disabled', () => {
    render(<NumberInput aria-label="Quantity" disabled />);
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toBeDisabled();
  });

  it('renders no increment or decrement buttons', () => {
    render(<NumberInput aria-label="Quantity" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
