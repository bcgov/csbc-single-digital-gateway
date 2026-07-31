import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeading } from '@/components/landing/section-heading';

describe('SectionHeading Component', () => {
  it('renders the title correctly', () => {
    render(<SectionHeading title="Test Section Title" />);

    const heading = screen.getByRole('heading', { name: 'Test Section Title', level: 2 });
    expect(heading).toBeInTheDocument();

    // Description element should not be rendered
    const description = screen.queryByRole('paragraph');
    expect(description).not.toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<SectionHeading title="Test Section Title" description="This is a test description." />);

    const description = screen.getByText('This is a test description.');
    expect(description).toBeInTheDocument();
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
