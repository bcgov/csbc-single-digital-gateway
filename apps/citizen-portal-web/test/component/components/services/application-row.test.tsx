import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationRow } from '@/components/services/application-row';
import type { MyApplication } from '@/lib/catalog';

// Doc 292 rule 7: the row is a router Link — rendered here as the anchor it becomes, with its params filled in.
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  Link: ({ to, params, children, className }: any) => (
    <a
      className={className}
      href={Object.entries(params ?? {}).reduce(
        (href: string, [key, value]) => href.replace(`$${key}`, String(value)),
        to,
      )}
    >
      {children}
    </a>
  ),
}));

vi.mock('@repo/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
}));

vi.mock('@repo/ui/badge', () => ({
  Badge: ({ children, color }: any) => (
    <span data-testid="badge" data-color={color}>
      {children}
    </span>
  ),
}));

/**
 * The row leads with the form it was made on (feature 217) and links again (doc 292 rule 7): a draft back to its apply
 * page when a published service offers its method, anything else to its application page.
 */
describe('ApplicationRow Component', () => {
  const mockApplication: MyApplication = {
    id: 'app-abc',
    serviceId: null,
    formId: 'form-123',
    formVersionId: 'ver-456',
    formTitle: 'Income Form',
    reference: '20260708-0001',
    status: 'pending',
    statusLabel: 'Submitted',
    lastUpdated: '2026-07-08T12:00:00.000Z',
  };

  it('leads with the form title and shows the status pill', () => {
    render(<ApplicationRow application={mockApplication} />);

    expect(screen.getByTestId('card-title')).toHaveTextContent('Income Form');
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('data-color', 'yellow');
    expect(badge).toHaveTextContent('Submitted');
  });

  it('shows the reference and the formatted last-updated date', () => {
    render(<ApplicationRow application={mockApplication} />);

    const description = screen.getByTestId('card-description');
    expect(description).toHaveTextContent('20260708-0001');
    expect(description).toHaveTextContent(
      new Date(mockApplication.lastUpdated).toLocaleDateString(),
    );
  });

  it('falls back to "Application" when the form version has no generated title', () => {
    render(<ApplicationRow application={{ ...mockApplication, formTitle: null }} />);

    expect(screen.getByTestId('card-title')).toHaveTextContent('Application');
  });

  it('links a submitted application to its page (doc 292 rule 7)', () => {
    render(<ApplicationRow application={mockApplication} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/applications/app-abc');
  });

  it('links a draft to its apply page, or to its own page when no service offers it (doc 292 rule 7)', () => {
    const draft = { ...mockApplication, status: 'draft' as const, statusLabel: 'Draft' };
    const { unmount } = render(<ApplicationRow application={{ ...draft, serviceId: 'svc-9' }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/services/svc-9/apply/form-123');
    unmount();

    render(<ApplicationRow application={draft} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/applications/app-abc');
  });
});
