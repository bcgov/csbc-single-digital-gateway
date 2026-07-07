import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/layout/site-footer';

describe('SiteFooter Component', () => {
  it('renders land acknowledgement band', () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/The B.C. Public Service acknowledges the territories of First Nations/i),
    ).toBeInTheDocument();
  });

  it('renders footer columns and their navigation links', () => {
    render(<SiteFooter />);

    // Verify all major column headings
    expect(
      screen.getByRole('heading', { name: 'Single Digital Gateway', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'More info', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Legal', level: 2 })).toBeInTheDocument();

    // Verify some key links are present
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services');
    expect(screen.getByRole('link', { name: 'Disclaimer' })).toHaveAttribute(
      'href',
      'https://www2.gov.bc.ca/gov/content/home/disclaimer',
    );
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      'https://www2.gov.bc.ca/gov/content/home/privacy',
    );
  });

  it('renders the B.C. logo and support text', () => {
    render(<SiteFooter />);

    expect(screen.getByLabelText('Government of British Columbia')).toBeInTheDocument();
    expect(
      screen.getByText(/We can help in over 220 languages and through other accessible options/i),
    ).toBeInTheDocument();
  });

  it('renders the copyright info', () => {
    render(<SiteFooter />);

    expect(screen.getByText(/© 2027 Government of British Columbia/i)).toBeInTheDocument();
  });
});
