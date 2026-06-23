import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@ui/components/ui/input-otp';

// jsdom lacks document.elementFromPoint, which the input-otp library calls from
// an internal timer after focus. Provide a no-op so the timer cannot throw an
// unhandled error that would poison the run.
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

function SixDigitOTP() {
  return (
    <InputOTP maxLength={6} aria-label="one-time code">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

describe('InputOTP', () => {
  it('renders the underlying input with its data-slot', () => {
    render(<SixDigitOTP />);
    const input = screen.getByRole('textbox', { name: 'one-time code' });
    expect(input).toHaveAttribute('data-slot', 'input-otp');
    expect(input).toHaveAttribute('maxlength', '6');
  });

  it('renders all slots and the separator structure', () => {
    const { container } = render(<SixDigitOTP />);
    expect(container.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-slot="input-otp-group"]')).toHaveLength(2);
    expect(screen.getByRole('separator')).toHaveAttribute('data-slot', 'input-otp-separator');
  });

  it('reflects typed characters into the slots', async () => {
    const user = userEvent.setup();
    render(<SixDigitOTP />);
    const input = screen.getByRole('textbox', { name: 'one-time code' });
    await user.type(input, '123');
    expect(input).toHaveValue('123');
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('respects the disabled state', () => {
    render(
      <InputOTP maxLength={4} disabled aria-label="code">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(screen.getByRole('textbox', { name: 'code' })).toBeDisabled();
  });
});
