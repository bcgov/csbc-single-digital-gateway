import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SiteFooter } from '@/components/layout/site-footer';

// Mock Logo component to isolate SiteFooter testing
vi.mock('@repo/ui/logo', () => ({
  Logo: (props: any) => <div data-testid="logo" {...props} />,
}));

describe('SiteFooter Component', () => {
  it('renders the land acknowledgement section correctly', () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/The B.C. Public Service acknowledges the territories of First Nations/i),
    ).toBeInTheDocument();
  });

  it('renders the brand logo and support translation copy', () => {
    render(<SiteFooter />);

    // Logo
    expect(screen.getByTestId('logo')).toBeInTheDocument();

    // Translation options paragraph
    expect(
      screen.getByText(/We can help in over 220 languages and through other accessible options/i),
    ).toBeInTheDocument();
  });

  it('renders footer link column headings and items', () => {
    render(<SiteFooter />);

    // Assert headings as navigations
    const gatewayNav = screen.getByRole('navigation', { name: 'Single Digital Gateway' });
    const infoNav = screen.getByRole('navigation', { name: 'More info' });
    const legalNav = screen.getByRole('navigation', { name: 'Legal' });

    expect(gatewayNav).toBeInTheDocument();
    expect(infoNav).toBeInTheDocument();
    expect(legalNav).toBeInTheDocument();

    // Assert individual links within those lists
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Help' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'About gov.bc.ca' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About CSBC' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Disclaimer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accessibility' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Copyright' })).toBeInTheDocument();
  });

  it('renders the copyright notice with the current year', () => {
    render(<SiteFooter />);

    const currentYear = new Date().getFullYear();
    const copyrightRegex = new RegExp(`© ${currentYear} Government of British Columbia`, 'i');
    expect(screen.getByText(copyrightRegex)).toBeInTheDocument();
  });
});
