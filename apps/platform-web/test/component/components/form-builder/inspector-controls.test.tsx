import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Row, SegmentedToggle } from '@/components/form-builder/inspector-controls';

describe('Inspector Controls Unit Test Suite', () => {
  describe('Row component', () => {
    it('renders label with htmlFor and children', () => {
      render(
        <Row label="Field Label" htmlFor="field-input">
          <input id="field-input" placeholder="Enter text" />
        </Row>,
      );

      const label = screen.getByText('Field Label');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', 'field-input');
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });
  });

  describe('SegmentedToggle component', () => {
    const options = [
      { value: 'option-a', label: 'Option A' },
      { value: 'option-b', label: 'Option B' },
      { value: 'option-c', label: 'Option C' },
    ];

    it('renders toggle items without fullWidth', () => {
      const handleChange = vi.fn();
      const { container } = render(
        <SegmentedToggle
          options={options}
          value="option-a"
          onValueChange={handleChange}
          fullWidth={false}
        />,
      );

      const toggleGroup = container.querySelector('[role="group"]');
      expect(toggleGroup).not.toHaveClass('w-full');

      const optionA = screen.getByRole('button', { name: 'Option A' });
      expect(optionA).toHaveAttribute('aria-pressed', 'true');
      expect(optionA).not.toHaveClass('flex-1');

      const optionB = screen.getByRole('button', { name: 'Option B' });
      expect(optionB).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders toggle items with fullWidth', () => {
      const handleChange = vi.fn();
      const { container } = render(
        <SegmentedToggle
          options={options}
          value="option-b"
          onValueChange={handleChange}
          fullWidth={true}
        />,
      );

      const toggleGroup = container.querySelector('[role="group"]');
      expect(toggleGroup).toHaveClass('w-full');

      const optionB = screen.getByRole('button', { name: 'Option B' });
      expect(optionB).toHaveAttribute('aria-pressed', 'true');
      expect(optionB).toHaveClass('flex-1');

      const optionA = screen.getByRole('button', { name: 'Option A' });
      expect(optionA).toHaveClass('flex-1');
    });

    it('calls onValueChange with the newly selected option when another item is clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<SegmentedToggle options={options} value="option-a" onValueChange={handleChange} />);

      const optionB = screen.getByRole('button', { name: 'Option B' });
      await user.click(optionB);

      expect(handleChange).toHaveBeenCalledWith('option-b');
    });

    it('retains the current value when the active option is clicked (unselecting is prevented)', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<SegmentedToggle options={options} value="option-a" onValueChange={handleChange} />);

      const optionA = screen.getByRole('button', { name: 'Option A' });
      await user.click(optionA);

      expect(handleChange).toHaveBeenCalledWith('option-a');
    });
  });
});
