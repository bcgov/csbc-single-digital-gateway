import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactSection } from '@/components/services/contact-section';

const methods = [
  {
    type: 'phone',
    label: 'Support line',
    entries: [{ label: 'Toll free', value: '1-800-555-0000' }],
  },
  {
    type: 'links',
    label: 'Online',
    entries: [{ label: 'Website', value: 'https://gov.bc.ca' }],
  },
];

describe('citizen service Contact section', () => {
  it('renders a card per contact method with its label and values', () => {
    render(<ContactSection value={methods} />);
    expect(screen.getByText('Support line')).toBeInTheDocument();
    expect(screen.getByText('1-800-555-0000')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText(/gov\.bc\.ca/)).toBeInTheDocument();
  });

  it('shows a muted empty-state message when there are no contact methods', () => {
    render(<ContactSection value={undefined} />);
    expect(screen.getByText(/no contact information/i)).toBeInTheDocument();
    render(<ContactSection value={[]} />);
    expect(screen.getAllByText(/no contact information/i).length).toBeGreaterThan(0);
  });
});
