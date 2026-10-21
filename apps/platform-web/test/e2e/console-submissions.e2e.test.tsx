import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../support/render-app';
import { mockSubmissionsBff } from '../support/mock-submissions-bff';
import { ISO } from '../support/fixtures';

const summary = {
  id: 'sub1',
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Console Submissions Integration Test Suite', () => {
  it('Should list the workspace submissions for review', async () => {
    mockSubmissionsBff({ items: [summary] }, { testFile: 'console-submissions.e2e.test', detail });
    renderApp('/app/riverton/submissions');
    expect(
      await screen.findByRole('link', { name: 'Amina Ali' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    // Feature 217: a submission no longer knows its service — the row names the FORM it was
    // made on, and the Service column is gone.
    expect(screen.getByText('Income application')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Service' })).toBeNull();
    expect(screen.getByText('Income application')).toBeInTheDocument();
    expect(screen.getByText('20260601-AB12')).toBeInTheDocument();
  });

  it('Should drive the queue API from the status tab, search, and sort controls', async () => {
    const fetchMock = mockSubmissionsBff(
      { items: [summary] },
      { testFile: 'console-submissions.e2e.test', detail },
    );
    renderApp('/app/riverton/submissions');
    await screen.findByRole('link', { name: 'Amina Ali' }, { timeout: 32000 });
    const user = userEvent.setup();
    const listCall = (predicate: (url: string) => boolean) =>
      fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return /\/v1\/submissions\?/.test(url) && predicate(url);
      });
    // Default queue request carries paging + the default sort.
    expect(listCall((url) => url.includes('sort=submitted') && url.includes('limit=20'))).toBe(
      true,
    );
    // The status tab adds a status filter.
    await user.click(screen.getByRole('tab', { name: 'Approved' }));
    await waitFor(() => expect(listCall((url) => url.includes('status=approved'))).toBe(true));
    // Search adds an ILIKE q.
    await user.type(screen.getByRole('searchbox'), 'amina');
    await waitFor(() => expect(listCall((url) => url.includes('q=amina'))).toBe(true));
    // A sortable header changes the sort column.
    await user.click(screen.getByRole('button', { name: /sort by status/i }));
    await waitFor(() => expect(listCall((url) => url.includes('sort=status'))).toBe(true));
  });

  it('Should open a submission and records a review decision', async () => {
    const fetchMock = mockSubmissionsBff(
      { items: [summary] },
      { testFile: 'console-submissions.e2e.test', detail },
    );
    const user = userEvent.setup();
    renderApp('/app/riverton/submissions/sub1');

    expect(
      await screen.findByRole('heading', { name: 'Amina Ali', level: 1 }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Income application')).toBeInTheDocument();

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
