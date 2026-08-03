import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgreementsList } from '@/components/console/service-agreements/agreements-list';
import type { AgreementScope } from '@/components/console/service-agreements/scope';

const mockNavigate = vi.fn();
const mockUseSearch = vi.fn(() => ({}));
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearch: () => mockUseSearch(),
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
  };
});

let mockItems: any[] = [];
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: { items: mockItems, total: mockItems.length }, isSuccess: true }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  mockItems = [];
  mockUseSearch.mockReturnValue({});
});

const workspaceScope: AgreementScope = { kind: 'workspace', slug: 'riverton', workspaceId: 'w1' };
const adminScope: AgreementScope = { kind: 'admin' };

describe('AgreementsList Component Test Suite', () => {
  it('renders workspace scope empty state and navigates to new agreement page', async () => {
    mockItems = [];
    render(<AgreementsList scope={workspaceScope} />);

    expect(
      screen.getByText('No service agreements yet — create one with the New button.'),
    ).toBeInTheDocument();

    const newBtn = screen.getByRole('button', { name: /new agreement/i });
    await userEvent.click(newBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/service-agreements/new',
      params: { slug: 'riverton' },
    });
  });

  it('renders admin scope empty state and navigates to admin new agreement page', async () => {
    mockItems = [];
    render(<AgreementsList scope={adminScope} />);

    const newBtn = screen.getByRole('button', { name: /new agreement/i });
    await userEvent.click(newBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/admin/service-agreements/new',
    });
  });

  it('renders a list of agreements with correct titles, statuses, and scopes for workspace', () => {
    mockItems = [
      {
        id: '1',
        title: 'Workspace TOS',
        status: 'draft',
        isGlobal: false,
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: '2',
        title: 'Global Privacy Policy',
        status: 'published',
        isGlobal: true,
        updatedAt: '2026-07-02T00:00:00.000Z',
      },
    ];

    render(<AgreementsList scope={workspaceScope} />);

    // Verify list headers
    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();

    // Verify row 1
    const row1Link = screen.getByRole('link', { name: 'Workspace TOS' });
    expect(row1Link).toBeInTheDocument();
    expect(row1Link).toHaveAttribute('href', '/app/riverton/service-agreements/1');
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-07-01T00:00:00.000Z').toLocaleDateString()),
    ).toBeInTheDocument();

    // Verify row 2
    const row2Link = screen.getByRole('link', { name: 'Global Privacy Policy' });
    expect(row2Link).toBeInTheDocument();
    expect(row2Link).toHaveAttribute('href', '/app/riverton/service-agreements/2');
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-07-02T00:00:00.000Z').toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it('renders a list of agreements with correct links for admin scope', () => {
    mockItems = [
      {
        id: '1',
        title: 'Global TOS',
        status: 'draft',
        isGlobal: true,
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ];

    render(<AgreementsList scope={adminScope} />);

    const link = screen.getByRole('link', { name: 'Global TOS' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/service-agreements/1');
  });

  it('renders no matches empty state when search term returns no results', () => {
    mockItems = [];
    mockUseSearch.mockReturnValue({ q: 'nonexistent' });
    render(<AgreementsList scope={workspaceScope} />);

    expect(screen.getByText('No agreements match “nonexistent”.')).toBeInTheDocument();
  });
});
