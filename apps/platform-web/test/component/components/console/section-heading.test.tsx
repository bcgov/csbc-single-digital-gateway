import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SectionHeading } from '@/components/console/section-heading';

afterEach(cleanup);

describe('SectionHeading', () => {
  it('renders the title as a level-2 heading with the accent-tab class', () => {
    render(<SectionHeading title="Eligibility criteria" />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Eligibility criteria' });
    expect(heading).toHaveClass('section-heading');
  });

  it('renders an optional description and children', () => {
    render(
      <SectionHeading title="Service description" description="Tell citizens what this service is.">
        <span>extra</span>
      </SectionHeading>,
    );
    expect(screen.getByText('Tell citizens what this service is.')).toBeInTheDocument();
    expect(screen.getByText('extra')).toBeInTheDocument();
  });

  it('omits the description paragraph when none is given', () => {
    const { container } = render(<SectionHeading title="Configuration" />);
    expect(container.querySelector('p')).toBeNull();
  });
});
