import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationRow } from '@/components/services/application-row';
import type { MyApplication } from '@/lib/catalog';

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
 * Feature 217: the row led with the owning SERVICE's name and linked to `/applications/:id`.
 * A submission no longer knows its service, and the application page went with the `@repo/react`
 * renderers, so the row leads with the form and is not a link.
 */
describe('ApplicationRow Component', () => {
  const mockApplication: MyApplication = {
    id: 'app-abc',
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

  it('is no longer a link — there is nowhere to navigate to yet', () => {
    render(<ApplicationRow application={mockApplication} />);

    expect(screen.queryByRole('link')).toBeNull();
  });
});
