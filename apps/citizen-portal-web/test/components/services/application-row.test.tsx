import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationRow } from '@/components/services/application-row';
import type { MyApplication } from '@/lib/catalog';

// Mock UI elements from @repo
vi.mock('@repo/ui/card', () => ({
  Card: ({ children, column }: any) => (
    <div data-testid="card" data-column={column ? 'true' : 'false'}>
      {children}
    </div>
  ),
  CardIconAction: ({ children, size }: any) => (
    <div data-testid="card-icon-action" data-size={size}>
      {children}
    </div>
  ),
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

// Mock @mdi/react Icon component
vi.mock('@mdi/react', () => ({
  Icon: ({ path, size, className }: any) => (
    <span data-testid="icon" data-path={path} data-size={size} className={className} />
  ),
}));

// Mock @tanstack/react-router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    const href = to.replace('$id', params?.id || '');
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe('ApplicationRow Component', () => {
  const mockApplication: MyApplication = {
    id: 'app-abc',
    serviceId: 'svc-123',
    serviceVersionId: 'ver-456',
    serviceTitle: 'Income Assistance',
    formTitle: 'Income Form',
    reference: '20260708-0001',
    status: 'pending',
    statusLabel: 'Submitted',
    lastUpdated: '2026-07-08T12:00:00.000Z',
  };

  it('renders application details correctly in card elements', () => {
    render(<ApplicationRow application={mockApplication} />);

    // Assert card and card-header are in the document
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();

    // Assert Title Link and target path substitution
    const link = screen.getByRole('link', { name: /Income Assistance/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/applications/app-abc');

    // Assert Badge
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('data-color', 'yellow');
    expect(badge).toHaveTextContent('Submitted');

    // Assert remaining descriptions: reference, formTitle and formatted date
    const descriptionText = screen.getByTestId('card-description');
    expect(descriptionText).toHaveTextContent('20260708-0001');
    expect(descriptionText).toHaveTextContent('Income Form');

    const formattedDate = new Date(mockApplication.lastUpdated).toLocaleDateString();
    expect(descriptionText).toHaveTextContent(formattedDate);
  });
});
