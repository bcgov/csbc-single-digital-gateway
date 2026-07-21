import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const mockSubmissionsList = {
  items: [
    {
      id: 'sub-123',
      serviceId: 'srv-123',
      serviceTitle: 'Parking Permits',
      formId: 'form-123',
      formTitle: 'Application Form',
      applicantName: 'Lewis Chen',
      applicantEmail: 'lewis@example.com',
      status: 'pending',
      statusLabel: 'Pending Review',
      reference: 'REF-0001',
      submittedAt: '2026-07-15T00:00:00Z',
    },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withSubmissions(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/submissions')) {
      return json(mockSubmissionsList);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Submissions Index Route', () => {
  it('renders the submissions list queue correctly', async () => {
    withSubmissions(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/submissions/');

    // Wait for the tab buttons to be rendered
    expect(await screen.findByRole('tab', { name: 'All' }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'In review' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Needs changes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Approved' })).toBeInTheDocument();

    // Verify headers inside the submissions table
    expect(await screen.findByText('Applicant')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();

    // Verify submission row details are correctly loaded asynchronously
    expect(await screen.findByText('Lewis Chen')).toBeInTheDocument();
    expect(screen.getByText('REF-0001')).toBeInTheDocument();
    expect(screen.getByText('Parking Permits')).toBeInTheDocument();
    expect(screen.getByText('Application Form')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });
});
