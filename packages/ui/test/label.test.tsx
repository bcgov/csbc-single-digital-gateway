import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Label } from '@ui/components/ui/label';

describe('Label', () => {
  it('renders a label element with the label slot', () => {
    render(<Label>Email</Label>);
    const label = screen.getByText('Email');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('data-slot', 'label');
  });

  it('associates with a control via htmlFor and focuses it on click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="email">Email address</Label>
        <input id="email" />
      </>,
    );

    const input = screen.getByLabelText('Email address');
    expect(input).toHaveAttribute('id', 'email');

    await user.click(screen.getByText('Email address'));
    expect(input).toHaveFocus();
  });

  it('merges a custom className', () => {
    render(<Label className="custom-marker">Name</Label>);
    expect(screen.getByText('Name').className).toContain('custom-marker');
  });
});
