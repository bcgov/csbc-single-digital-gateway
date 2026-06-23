import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Slider } from '@ui/components/ui/slider';

// Base UI renders each slider thumb as a visually-hidden <input type="range">,
// which carries role="slider" and the aria-value* attributes. The inputs are
// clipped/hidden via CSS, so accessible queries use `hidden: true`.

describe('Slider', () => {
  it('renders a slider thumb with the expected aria value attributes', () => {
    render(<Slider defaultValue={[40]} min={0} max={100} aria-label="Volume" />);

    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '40');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
  });

  it('increases the value when the thumb is focused and ArrowRight is pressed', async () => {
    const user = userEvent.setup();
    render(<Slider defaultValue={[40]} min={0} max={100} aria-label="Volume" />);

    const slider = screen.getByRole('slider', { hidden: true });
    slider.focus();
    expect(slider).toHaveFocus();

    await user.keyboard('{ArrowRight}');

    expect(slider).toHaveAttribute('aria-valuenow', '41');
  });

  it('decreases the value when ArrowLeft is pressed', async () => {
    const user = userEvent.setup();
    render(<Slider defaultValue={[40]} min={0} max={100} aria-label="Volume" />);

    const slider = screen.getByRole('slider', { hidden: true });
    slider.focus();

    await user.keyboard('{ArrowLeft}');

    expect(slider).toHaveAttribute('aria-valuenow', '39');
  });

  it('renders one thumb per value for a range slider', () => {
    render(<Slider defaultValue={[20, 80]} min={0} max={100} aria-label="Range" />);

    expect(screen.getAllByRole('slider', { hidden: true })).toHaveLength(2);
  });
});
