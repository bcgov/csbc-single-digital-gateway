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

const mockBasicSubmission = {
  id: 'sub-123',
  serviceId: 'srv-123',
  serviceTitle: 'Parking Permits',
  formId: 'form-123',
  formTitle: 'Application Form',
  applicantName: 'Test User',
  applicantEmail: 'test@example.com',
  status: 'pending',
  statusLabel: 'Pending Review',
  reference: 'REF-0001',
  submittedAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
  kind: 'basic-form',
  structure: {
    schema: { type: 'object', properties: {} },
    uischema: { type: 'VerticalLayout', elements: [] },
  },
  data: {},
  reviews: [],
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
    if (url.includes('/v1/submissions/sub-123')) {
      return json(mockBasicSubmission);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Submissions ID Detail Route', () => {
  it('renders the submission detail page correctly', async () => {
    withSubmissions(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/submissions/sub-123');

    // Wait for the submission detail header to render
    expect(await screen.findByText('Test User', undefined, { timeout: 32000 })).toBeInTheDocument();

    // Verify submission details and metadata
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText(/Parking Permits · Application Form/i)).toBeInTheDocument();
    expect(screen.getByText(/REF-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/i)).toBeInTheDocument();

    // Verify answers section header
    expect(screen.getByText('Answers')).toBeInTheDocument();

    // Verify review decision buttons are rendered
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    // Verify notes textarea is present
    expect(
      screen.getByPlaceholderText('Add a note for the applicant (optional)…'),
    ).toBeInTheDocument();
  });
});
