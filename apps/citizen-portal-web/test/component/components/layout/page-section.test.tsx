import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSection, SectionHeading } from '@/components/layout/page-section';

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

describe('PageSection', () => {
  it('renders a section with a level-2 heading and its children', () => {
    render(
      <PageSection id="test-sec" title="Test Section Title">
        <p>Test Child Content</p>
      </PageSection>,
    );
    expect(
      screen.getByRole('heading', { name: 'Test Section Title', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('becomes a scroll-offset anchor target only when given an id', () => {
    const { container, rerender } = render(
      <PageSection id="anchor" title="Anchored">
        <p>body</p>
      </PageSection>,
    );
    expect(container.querySelector('section#anchor')).toHaveClass('scroll-mt-6');
    rerender(
      <PageSection title="Plain">
        <p>body</p>
      </PageSection>,
    );
    expect(container.querySelector('section')).not.toHaveClass('scroll-mt-6');
  });

  it('renders the description under the heading', () => {
    render(
      <PageSection title="With description" description="Supporting copy.">
        <p>body</p>
      </PageSection>,
    );
    expect(screen.getByText('Supporting copy.')).toBeInTheDocument();
  });
});
