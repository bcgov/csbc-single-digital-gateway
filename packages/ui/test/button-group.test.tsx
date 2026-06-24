import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@ui/components/ui/button-group';
import { Button } from '@ui/components/ui/button';

describe('ButtonGroup', () => {
  it('renders a group role containing its children', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-slot', 'button-group');
    expect(within(group).getByRole('button', { name: 'One' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Two' })).toBeInTheDocument();
  });

  it('defaults orientation styling to horizontal', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
      </ButtonGroup>,
    );
    // orientation prop is undefined by default, so data-orientation is not set,
    // but the horizontal variant classes are applied via cva defaultVariants.
    expect(screen.getByRole('group').className).toContain('rounded-r-none');
  });

  it('reflects an explicit vertical orientation', () => {
    render(
      <ButtonGroup orientation="vertical">
        <Button>One</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-orientation', 'vertical');
    expect(group.className).toContain('flex-col');
  });

  it('merges a custom className', () => {
    render(
      <ButtonGroup className="custom-marker">
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group').className).toContain('custom-marker');
  });

  it('renders ButtonGroupText content', () => {
    render(
      <ButtonGroup>
        <ButtonGroupText>Label</ButtonGroupText>
      </ButtonGroup>,
    );
    const text = screen.getByText('Label');
    expect(text).toHaveAttribute('data-slot', 'button-group-text');
  });

  it('renders a separator with the correct slot', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <ButtonGroupSeparator />
        <Button>Two</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group.querySelector('[data-slot="button-group-separator"]')).toBeInTheDocument();
  });
});
