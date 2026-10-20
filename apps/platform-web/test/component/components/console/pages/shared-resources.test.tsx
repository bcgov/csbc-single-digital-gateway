import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharedResourcesPage } from '@/components/console/pages/shared-resources';

const { paramsRef } = vi.hoisted(() => ({
  paramsRef: { current: { slug: 'riverton' } as { slug?: string } },
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => paramsRef.current,
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

afterEach(() => {
  vi.restoreAllMocks();
  paramsRef.current = { slug: 'riverton' };
});

describe('SharedResourcesPage Component Test Suite', () => {
  it('Should render the hub with a Service Agreements card linking into the section with slug param', () => {
    render(<SharedResourcesPage />);

    expect(screen.getByRole('heading', { name: 'Shared Resources' })).toBeInTheDocument();
    expect(
      screen.getByText('Resources shared across the services in this workspace.'),
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /service agreements/i });
    expect(link).toHaveAttribute('href', '/app/riverton/service-agreements');
  });

  it('Should handle undefined slug parameter by falling back to empty string', () => {
    paramsRef.current = {};
    render(<SharedResourcesPage />);

    const link = screen.getByRole('link', { name: /service agreements/i });
    expect(link).toHaveAttribute('href', '/app//service-agreements');
  });
});
