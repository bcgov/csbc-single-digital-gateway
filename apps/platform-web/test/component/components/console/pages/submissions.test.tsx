import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const mockWorkspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  createdAt: ISO,
};

const submissionsList = [
  {
    id: 'sub-1',
    serviceId: 'srv-1',
    serviceTitle: 'Business License',
    formId: 'frm-1',
    formTitle: 'Application Form',
    applicantName: 'Alice Smith',
    applicantEmail: 'alice@example.com',
    status: 'pending' as const,
    statusLabel: 'Pending Review',
    reference: 'REF-001',
    submittedAt: '2026-06-02T10:00:00.000Z',
    updatedAt: ISO,
  },
  {
    id: 'sub-2',
    serviceId: 'srv-1',
    serviceTitle: 'Business License',
    formId: 'frm-1',
    formTitle: 'Application Form',
    applicantName: 'Bob Jones',
    applicantEmail: 'bob@example.com',
    status: 'approved' as const,
    statusLabel: 'Approved',
    reference: 'REF-002',
    submittedAt: '2026-06-03T11:00:00.000Z',
    updatedAt: ISO,
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockSubmissionsApi(submissions: any[] = submissionsList, workspace: any = mockWorkspace) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/auth/me')) {
      return json(authedUser);
    }
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(workspace);
    }
    if (url.includes('/v1/workspaces')) {
      return json({ items: [workspace], total: 1, limit: 100, offset: 0 });
    }
    if (url.includes('/v1/submissions')) {
      const searchParams = new URL(url, 'http://x').searchParams;
      const statusParam = searchParams.get('status');
      const filtered = statusParam
        ? submissions.filter((s) => s.status === statusParam)
        : submissions;
      return json({ items: filtered });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('SubmissionsPage Component Test Suite', () => {
  it('renders loading skeleton when data is fetching', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL) =>
        new Promise<any>((resolve) => {
          const url = String(input);
          if (url.includes('/auth/me')) {
            resolve(json(authedUser));
          } else if (url.includes('/v1/workspaces/by-slug/riverton')) {
            resolve(json(mockWorkspace));
          }
          // Do not resolve submissions list to keep it loading
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = renderApp('/app/riverton/submissions');

    await waitFor(
      () => {
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      },
      { timeout: 32000 },
    );
  });

  it('renders submission records with correct fields and links', async () => {
    mockSubmissionsApi();
    renderApp('/app/riverton/submissions');

    // Wait for the table rows to render
    const linkAlice = await screen.findByRole('link', { name: 'Alice Smith' }, { timeout: 32000 });
    const linkBob = await screen.findByRole('link', { name: 'Bob Jones' }, { timeout: 32000 });

    expect(linkAlice).toBeInTheDocument();
    expect(linkAlice).toHaveAttribute('href', '/app/riverton/submissions/sub-1');
    expect(screen.getByText('REF-001')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-06-02T10:00:00.000Z').toLocaleDateString()),
    ).toBeInTheDocument();
    expect(linkBob).toBeInTheDocument();
    expect(linkBob).toHaveAttribute('href', '/app/riverton/submissions/sub-2');
    expect(screen.getByText('REF-002')).toBeInTheDocument();
    expect(screen.getAllByText('Approved')).toHaveLength(2);
    expect(
      screen.getByText(new Date('2026-06-03T11:00:00.000Z').toLocaleDateString()),
    ).toBeInTheDocument();

    // Verify service and form labels render
    expect(screen.getAllByText('Business License')).toHaveLength(2);
    expect(screen.getAllByText('Application Form')).toHaveLength(2);
  });

  it('filters submissions when clicking status tabs', async () => {
    mockSubmissionsApi();
    renderApp('/app/riverton/submissions');
    const user = userEvent.setup();

    // By default all items are present
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Switch to Pending tab
    const pendingTab = screen.getByRole('tab', { name: 'Pending' });
    await user.click(pendingTab);

    // Should only display Alice Smith
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    });

    // Switch to Approved tab
    const approvedTab = screen.getByRole('tab', { name: 'Approved' });
    await user.click(approvedTab);

    // Should only display Bob Jones
    await waitFor(() => {
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    // Switch back to All tab
    const allTab = screen.getByRole('tab', { name: 'All' });
    await user.click(allTab);

    // Should display both records again
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });
  });

  it('renders "—" when submittedAt date is null', async () => {
    const nullDateSubmission = [
      {
        id: 'sub-3',
        serviceId: 'srv-1',
        serviceTitle: 'Business License',
        formId: 'frm-1',
        formTitle: 'Application Form',
        applicantName: 'Charlie Brown',
        applicantEmail: 'charlie@example.com',
        status: 'pending' as const,
        statusLabel: 'Pending Review',
        reference: 'REF-003',
        submittedAt: null as any,
        updatedAt: ISO,
      },
    ];
    mockSubmissionsApi(nullDateSubmission);
    renderApp('/app/riverton/submissions');

    const linkCharlie = await screen.findByRole('link', { name: 'Charlie Brown' });
    expect(linkCharlie).toBeInTheDocument();

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('filters submissions for In review and Needs changes tabs', async () => {
    const extraSubmissions = [
      ...submissionsList,
      {
        id: 'sub-3',
        serviceId: 'srv-1',
        serviceTitle: 'Business License',
        formId: 'frm-1',
        formTitle: 'Application Form',
        applicantName: 'Charlie Brown',
        applicantEmail: 'charlie@example.com',
        status: 'in_review' as const,
        statusLabel: 'In review',
        reference: 'REF-003',
        submittedAt: '2026-06-04T12:00:00.000Z',
        updatedAt: ISO,
      },
      {
        id: 'sub-4',
        serviceId: 'srv-1',
        serviceTitle: 'Business License',
        formId: 'frm-1',
        formTitle: 'Application Form',
        applicantName: 'Diana Prince',
        applicantEmail: 'diana@example.com',
        status: 'needs_changes' as const,
        statusLabel: 'Needs changes',
        reference: 'REF-004',
        submittedAt: '2026-06-05T13:00:00.000Z',
        updatedAt: ISO,
      },
    ];

    mockSubmissionsApi(extraSubmissions);
    renderApp('/app/riverton/submissions');
    const user = userEvent.setup();

    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.getByText('Diana Prince')).toBeInTheDocument();

    const inReviewTab = screen.getByRole('tab', { name: 'In review' });
    await user.click(inReviewTab);

    await waitFor(() => {
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
      expect(screen.queryByText('Diana Prince')).not.toBeInTheDocument();
    });

    const needsChangesTab = screen.getByRole('tab', { name: 'Needs changes' });
    await user.click(needsChangesTab);

    await waitFor(() => {
      expect(screen.getByText('Diana Prince')).toBeInTheDocument();
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
    });
  });

  it('does not render loading skeleton when workspace is loading', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL) =>
        new Promise<any>((resolve) => {
          const url = String(input);
          if (url.includes('/auth/me')) {
            resolve(json(authedUser));
          }
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = renderApp('/app/riverton/submissions');

    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('falls back to "All" tab when status parameter in search is unknown/not in tabs', async () => {
    mockSubmissionsApi();
    renderApp('/app/riverton/submissions?status=withdrawn');

    // Should display empty state because no items match "withdrawn" status
    expect(
      await screen.findByText('No submissions yet — they appear here once applicants submit.'),
    ).toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: 'All' });
    expect(allTab).toHaveAttribute('data-active');
  });

  it('renders no matches empty state when search term returns no results', async () => {
    mockSubmissionsApi([]);
    renderApp('/app/riverton/submissions?q=nonexistent');

    expect(await screen.findByText('No submissions match “nonexistent”.')).toBeInTheDocument();
  });

  it('handles workspace with missing/null id gracefully', async () => {
    const mockWorkspaceNoId = {
      id: null as any,
      slug: 'riverton',
      name: 'Riverton',
      role: 'admin' as const,
      createdAt: ISO,
    };
    mockSubmissionsApi([], mockWorkspaceNoId);
    renderApp('/app/riverton/submissions');

    expect(
      await screen.findByPlaceholderText('Search applicant, service, ref…'),
    ).toBeInTheDocument();
  });
});
