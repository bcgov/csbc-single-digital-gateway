import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';
import { FEATURE_CARDS } from '@/lib/content';

describe('WhatYouCanDo Component', () => {
  it('renders the section heading and description', () => {
    render(<WhatYouCanDo />);

    expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'The Single Digital Gateway makes it easier to find and use government services online.',
      ),
    ).toBeInTheDocument();
  });

  it('renders all three marketing/feature cards with correct titles and descriptions', () => {
    render(<WhatYouCanDo />);

    // Verify all FEATURE_CARDS items are rendered
    FEATURE_CARDS.forEach((card) => {
      // Heading level 3 for cards
      expect(screen.getByRole('heading', { name: card.title, level: 3 })).toBeInTheDocument();
      expect(screen.getByText(card.description)).toBeInTheDocument();
    });
  });
});
