import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServiceBuilderBreadcrumb } from '@/components/console/services/service-builder-breadcrumb';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...props }: any) => {
    let href = to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe('ServiceBuilderBreadcrumb Component Test Suite', () => {
  it('renders services, active service, and current label breadcrumbs correctly', () => {
    render(
      <ServiceBuilderBreadcrumb
        slug="victoria"
        serviceId="srv-456"
        serviceTitle="Pet Licensing"
        label="Form Design"
      />,
    );

    // 1. Services link
    const servicesLink = screen.getByRole('link', { name: 'Services' });
    expect(servicesLink).toBeInTheDocument();
    expect(servicesLink.getAttribute('href')).toBe('/app/victoria/services');

    // 2. Active service link
    const serviceTitleLink = screen.getByRole('link', { name: 'Pet Licensing' });
    expect(serviceTitleLink).toBeInTheDocument();
    expect(serviceTitleLink.getAttribute('href')).toBe('/app/victoria/services/srv-456');

    // 3. Current label page
    const pageLabel = screen.getByText('Form Design');
    expect(pageLabel).toBeInTheDocument();
    expect(pageLabel.tagName).not.toBe('A');
  });
});
