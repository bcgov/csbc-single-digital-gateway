import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select';

function renderSelect(props?: React.ComponentProps<typeof NativeSelect>) {
  return render(
    <NativeSelect aria-label="Fruit" defaultValue="apple" {...props}>
      <NativeSelectOption value="apple">Apple</NativeSelectOption>
      <NativeSelectOption value="banana">Banana</NativeSelectOption>
      <NativeSelectOptGroup label="Citrus">
        <NativeSelectOption value="orange">Orange</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>,
  );
}

describe('NativeSelect', () => {
  it('renders a real combobox-role select wrapping the options', () => {
    renderSelect();
    const select = screen.getByRole('combobox', { name: 'Fruit' });
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveAttribute('data-slot', 'native-select');
  });

  it('updates its value when a different option is selected', async () => {
    const user = userEvent.setup();
    renderSelect();
    const select = screen.getByRole('combobox', {
      name: 'Fruit',
    }) as HTMLSelectElement;
    expect(select.value).toBe('apple');

    await user.selectOptions(select, 'banana');
    expect(select.value).toBe('banana');
  });

  it('fires onChange with the chosen option value', async () => {
    const user = userEvent.setup();
    let received = '';
    renderSelect({
      onChange: (e) => {
        received = e.currentTarget.value;
      },
    });
    await user.selectOptions(screen.getByRole('combobox'), 'orange');
    expect(received).toBe('orange');
  });

  it('applies the size data attribute to wrapper and select', () => {
    const { container } = renderSelect({ size: 'sm' });
    expect(container.querySelector('[data-slot="native-select-wrapper"]')).toHaveAttribute(
      'data-size',
      'sm',
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'sm');
  });

  it('disables the control via the disabled prop', () => {
    renderSelect({ disabled: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
