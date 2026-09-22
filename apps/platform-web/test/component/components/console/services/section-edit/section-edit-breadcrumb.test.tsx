import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionEditBreadcrumb } from '@/components/console/services/section-edit/section-edit-breadcrumb';

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

describe('SectionEditBreadcrumb Component Test Suite', () => {
  it('renders breadcrumb trail with canonical details link when versionId is undefined', () => {
    render(
      <SectionEditBreadcrumb
        slug="riverton"
        serviceId="srv-1"
        serviceTitle="Pet License"
        label="General Info"
      />,
    );

    // 1. Services link
    const servicesLink = screen.getByRole('link', { name: 'Services' });
    expect(servicesLink).toBeInTheDocument();
    expect(servicesLink.getAttribute('href')).toBe('/app/riverton/services');

    // 2. Service title link
    const serviceTitleLink = screen.getByRole('link', { name: 'Pet License' });
    expect(serviceTitleLink).toBeInTheDocument();
    expect(serviceTitleLink.getAttribute('href')).toBe('/app/riverton/services/srv-1');

    // 3. Service details link (canonical route when versionId is omitted)
    const detailsLink = screen.getByRole('link', { name: 'Service details' });
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink.getAttribute('href')).toBe('/app/riverton/services/srv-1/details');

    // 4. Current page label
    const pageLabel = screen.getByText('General Info');
    expect(pageLabel).toBeInTheDocument();
    expect(pageLabel.tagName).not.toBe('A');
  });

  it('renders breadcrumb trail with version permalink details link when versionId is provided', () => {
    render(
      <SectionEditBreadcrumb
        slug="riverton"
        serviceId="srv-1"
        versionId="ver-99"
        serviceTitle="Pet License"
        label="Eligibility Requirements"
      />,
    );

    // 1. Services link
    const servicesLink = screen.getByRole('link', { name: 'Services' });
    expect(servicesLink).toBeInTheDocument();
    expect(servicesLink.getAttribute('href')).toBe('/app/riverton/services');

    // 2. Service title link
    const serviceTitleLink = screen.getByRole('link', { name: 'Pet License' });
    expect(serviceTitleLink).toBeInTheDocument();
    expect(serviceTitleLink.getAttribute('href')).toBe('/app/riverton/services/srv-1');

    // 3. Service details link (version permalink route)
    const detailsLink = screen.getByRole('link', { name: 'Service details' });
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink.getAttribute('href')).toBe(
      '/app/riverton/services/srv-1/versions/ver-99/details',
    );

    // 4. Current page label
    const pageLabel = screen.getByText('Eligibility Requirements');
    expect(pageLabel).toBeInTheDocument();
    expect(pageLabel.tagName).not.toBe('A');
  });
});
