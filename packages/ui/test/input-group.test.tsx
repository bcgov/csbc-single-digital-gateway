import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
} from '@/components/ui/input-group';

describe('InputGroup', () => {
  it('renders a group wrapping a control', () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="amount" />
      </InputGroup>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-slot', 'input-group');
    expect(within(group).getByRole('textbox', { name: 'amount' })).toHaveAttribute(
      'data-slot',
      'input-group-control',
    );
  });

  it('lets the user type into the grouped input', async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <InputGroupAddon>$</InputGroupAddon>
        <InputGroupInput aria-label="price" />
      </InputGroup>,
    );
    const input = screen.getByRole('textbox', { name: 'price' });
    await user.type(input, '42');
    expect(input).toHaveValue('42');
  });

  it('applies the align data attribute to an addon', () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="q" />
        <InputGroupAddon align="inline-end" data-testid="addon">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>,
    );
    const addon = screen.getByTestId('addon');
    expect(addon).toHaveAttribute('data-slot', 'input-group-addon');
    expect(addon).toHaveAttribute('data-align', 'inline-end');
  });

  it('focuses the input when its addon is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <InputGroupAddon data-testid="addon">@</InputGroupAddon>
        <InputGroupInput aria-label="handle" />
      </InputGroup>,
    );
    await user.click(screen.getByTestId('addon'));
    expect(screen.getByRole('textbox', { name: 'handle' })).toHaveFocus();
  });

  it('renders an addon button that fires its click handler', async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <InputGroup>
        <InputGroupInput aria-label="search" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={() => (clicked = true)}>Go</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('data-size', 'xs');
    await user.click(button);
    expect(clicked).toBe(true);
  });
});
