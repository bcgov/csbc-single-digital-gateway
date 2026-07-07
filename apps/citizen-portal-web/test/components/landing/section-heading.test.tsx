import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeading } from '@/components/landing/section-heading';

describe('SectionHeading Component', () => {
  it('renders the title', () => {
    render(<SectionHeading title="My Heading" />);

    const titleElement = screen.getByRole('heading', { name: 'My Heading', level: 2 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass('text-foreground');
  });

  it('renders the description when provided', () => {
    render(<SectionHeading title="My Heading" description="This is a test description" />);

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<SectionHeading title="My Heading" />);

    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <SectionHeading title="My Heading">
        <span data-testid="custom-child">Child Element</span>
      </SectionHeading>,
    );

    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    expect(screen.getByText('Child Element')).toBeInTheDocument();
  });

  it('applies dark mode classes when tone is dark', () => {
    render(<SectionHeading title="Dark Heading" description="Dark description" tone="dark" />);

    const titleElement = screen.getByRole('heading', { name: 'Dark Heading', level: 2 });
    expect(titleElement).toHaveClass('text-white');

    const descElement = screen.getByText('Dark description');
    expect(descElement).toHaveClass('text-white/80');
  });

  it('applies default classes when tone is default or omitted', () => {
    render(<SectionHeading title="Default Heading" description="Default description" />);

    const titleElement = screen.getByRole('heading', { name: 'Default Heading', level: 2 });
    expect(titleElement).toHaveClass('text-foreground');

    const descElement = screen.getByText('Default description');
    expect(descElement).toHaveClass('text-muted-foreground');
  });
});
