import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactSection } from '@/components/services/contact-section';

const methods = [
  { type: 'phone', label: 'Support line', value: '+12505551234' },
  { type: 'links', label: 'Online', value: 'https://gov.bc.ca' },
  {
    type: 'address',
    label: 'Head office',
    address_one: '123 Government St',
    city: 'Victoria',
  },
];

describe('citizen service Contact section', () => {
  it('renders a link card per method with a per-type call-to-action', () => {
    render(<ContactSection value={methods} />);
    expect(screen.getByText('Support line')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText(/gov\.bc\.ca/)).toBeInTheDocument();

    // Per-type CTA text.
    expect(screen.getByText(/call us/i)).toBeInTheDocument();
    expect(screen.getByText(/visit website/i)).toBeInTheDocument();
    expect(screen.getByText(/get directions/i)).toBeInTheDocument();

    // Each card links to the right target.
    expect(screen.getByRole('link', { name: /support line/i })).toHaveAttribute(
      'href',
      'tel:+12505551234',
    );
    expect(screen.getByRole('link', { name: /online/i })).toHaveAttribute(
      'href',
      'https://gov.bc.ca',
    );
    expect(screen.getByRole('link', { name: /head office/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    );
  });

  it('shows a muted empty-state message when there are no contact methods', () => {
    render(<ContactSection value={undefined} />);
    expect(screen.getByText(/no contact information/i)).toBeInTheDocument();
    render(<ContactSection value={[]} />);
    expect(screen.getAllByText(/no contact information/i).length).toBeGreaterThan(0);
  });
});
