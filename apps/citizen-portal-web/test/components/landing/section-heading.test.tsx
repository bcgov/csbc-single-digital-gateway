import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeading } from '@/components/landing/section-heading';

describe('SectionHeading Component', () => {
  it('renders the title correctly with default tone classes', () => {
    render(<SectionHeading title="Test Section Title" />);

    const heading = screen.getByRole('heading', { name: 'Test Section Title', level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-foreground');
    expect(heading).not.toHaveClass('text-white');

    // Description element should not be rendered
    const description = screen.queryByRole('paragraph');
    expect(description).not.toBeInTheDocument();
  });

  it('renders the description with default tone classes when provided', () => {
    render(<SectionHeading title="Test Section Title" description="This is a test description." />);

    const description = screen.getByText('This is a test description.');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-muted-foreground');
    expect(description).not.toHaveClass('text-white/80');
  });

  it('renders dark tone classes correctly when tone is dark', () => {
    render(
      <SectionHeading
        title="Dark Section Title"
        description="This is a dark description."
        tone="dark"
      />,
    );

    const heading = screen.getByRole('heading', { name: 'Dark Section Title', level: 2 });
    expect(heading).toHaveClass('text-white');
    expect(heading).not.toHaveClass('text-foreground');

    const description = screen.getByText('This is a dark description.');
    expect(description).toHaveClass('text-white/80');
    expect(description).not.toHaveClass('text-muted-foreground');
  });

  it('renders children elements when provided', () => {
    render(
      <SectionHeading title="Title with Children">
        <button data-testid="child-btn">Extra Action</button>
      </SectionHeading>,
    );

    expect(screen.getByTestId('child-btn')).toBeInTheDocument();
    expect(screen.getByText('Extra Action')).toBeInTheDocument();
  });
});
