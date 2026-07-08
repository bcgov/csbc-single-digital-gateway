import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';

describe('WhatYouCanDo Component', () => {
  it('renders section title and three feature cards with descriptions', () => {
    render(<WhatYouCanDo />);

    // Assert SectionHeading is present
    expect(screen.getByRole('heading', { name: 'What you can do', level: 2 })).toBeInTheDocument();

    // Assert card titles (rendered as h3 headings)
    expect(
      screen.getByRole('heading', { name: 'Discover services', level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Apply and track your requests', level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Manage your information', level: 3 }),
    ).toBeInTheDocument();

    // Assert card descriptions
    expect(screen.getByText('Browse and search for government services.')).toBeInTheDocument();
    expect(
      screen.getByText('Submit applications online and check the status of your requests.'),
    ).toBeInTheDocument();
    expect(screen.getByText('View and update your information in one place.')).toBeInTheDocument();
  });
});
