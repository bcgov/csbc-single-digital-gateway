import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@ui/components/ui/button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies the destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('destructive');
  });

  it('merges a custom className', () => {
    render(<Button className="custom-marker">Hi</Button>);
    expect(screen.getByRole('button', { name: 'Hi' }).className).toContain('custom-marker');
  });
});
