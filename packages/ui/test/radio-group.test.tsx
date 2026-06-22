import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

function TestRadioGroup() {
  return (
    <RadioGroup defaultValue="comfortable" aria-label="Density">
      <label>
        <RadioGroupItem value="default" />
        Default
      </label>
      <label>
        <RadioGroupItem value="comfortable" />
        Comfortable
      </label>
      <label>
        <RadioGroupItem value="compact" />
        Compact
      </label>
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('renders a radiogroup containing all radio items', () => {
    render(<TestRadioGroup />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks the default value as checked', () => {
    render(<TestRadioGroup />);
    expect(screen.getByRole('radio', { name: 'Comfortable' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Default' })).toHaveAttribute('aria-checked', 'false');
  });

  it('updates the checked item when another option is selected', async () => {
    const user = userEvent.setup();
    render(<TestRadioGroup />);

    await user.click(screen.getByRole('radio', { name: 'Compact' }));

    expect(screen.getByRole('radio', { name: 'Compact' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Comfortable' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('fires onValueChange with the selected value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup onValueChange={onValueChange} aria-label="Density">
        <label>
          <RadioGroupItem value="a" />A
        </label>
        <label>
          <RadioGroupItem value="b" />B
        </label>
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'B' }));

    expect(onValueChange).toHaveBeenCalledWith('b', expect.anything());
  });
});
