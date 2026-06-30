import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from './support/render-app';

const ISO = '2026-06-01T00:00:00.000Z';
const workspace = { id: 'w1', slug: 'riverton', name: 'Riverton', role: 'admin', createdAt: ISO };

const summary = {
  id: 'sub1',
  serviceId: 'svc1',
  serviceTitle: 'Income Assistance',
  formId: 'f1',
  formTitle: 'Income application',
  applicantName: 'Amina Ali',
  applicantEmail: 'amina@example.ca',
  status: 'pending',
  statusLabel: 'Pending',
  reference: '20260601-AB12',
  submittedAt: ISO,
  updatedAt: ISO,
};

const detail = {
  ...summary,
  kind: 'basic-form',
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
  data: { name: 'Amina' },
  reviews: [] as Array<Record<string, unknown>>,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Stateful BFF mock: a review POST flips the submission to approved on subsequent reads. */
function mockSubmissions() {
  let reviewed = false;
  const approved = {
    ...detail,
    status: 'approved',
    statusLabel: 'Approved',
    reviews: [
      { id: 'r1', decision: 'approved', reason: null, reviewerName: 'Maya Reyes', createdAt: ISO },
    ],
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/v1/workspaces/by-slug/riverton')) return json(workspace);
    if (url.includes('/v1/submissions/sub1/review') && method === 'POST') {
      reviewed = true;
      return json(approved);
    }
    if (url.endsWith('/v1/submissions/sub1')) return json(reviewed ? approved : detail);
    if (url.includes('/v1/submissions')) {
      return json({
        items: [reviewed ? { ...summary, status: 'approved', statusLabel: 'Approved' } : summary],
      });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('console submissions', () => {
  it('lists the workspace submissions for review', async () => {
    mockSubmissions();
    renderApp('/app/riverton/submissions');
    expect(
      await screen.findByRole('link', { name: 'Amina Ali' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Income Assistance')).toBeInTheDocument();
    expect(screen.getByText('Income application')).toBeInTheDocument();
    expect(screen.getByText('20260601-AB12')).toBeInTheDocument();
  });

  it('opens a submission and records a review decision', async () => {
    const fetchMock = mockSubmissions();
    const user = userEvent.setup();
    renderApp('/app/riverton/submissions/sub1');

    expect(
      await screen.findByRole('heading', { name: 'Amina Ali', level: 1 }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Income Assistance · Income application')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/submissions/sub1/review'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      ),
    );
    // After the review the panel reflects the actioned status.
    expect(await screen.findByText(/has been actioned/i)).toBeInTheDocument();
  });
});
