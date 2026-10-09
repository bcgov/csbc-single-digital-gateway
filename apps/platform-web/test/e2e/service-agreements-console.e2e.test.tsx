import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../support/render-app';
import { globalAgreement as globalAgreementFixture, ISO } from '../support/fixtures';
import { mockServiceAgreementsBff } from '../support/mock-service-agreements-bff';
import type { ServiceAgreementSummary } from '@/lib/service-agreements';

afterEach(() => {
  vi.restoreAllMocks();
});

const workspaceAgreement: ServiceAgreementSummary = {
  id: 'a1',
  workspaceId: 'w1',
  title: 'Terms of service',
  kind: 'service-agreement',
  createdAt: ISO,
  updatedAt: ISO,
  status: 'draft',
  isGlobal: false,
};

const globalAgreement = {
  ...globalAgreementFixture,
  title: 'Privacy policy',
  updatedAt: ISO,
};

const agreements = [
  {
    ...workspaceAgreement,
    status: 'draft',
    id: 'a1',
    title: 'Terms of service',
  },
  {
    ...globalAgreement,
    status: 'draft',
    id: 'g1',
    title: 'Privacy policy',
  },
];

describe('Service Agreements Console Integration Test Suite', () => {
  it('Should open the New agreement modal (title + description) at /new', async () => {
    mockServiceAgreementsBff(workspaceAgreement, {
      testFile: 'service-agreements-console.e2e.test',
      agreements,
    });
    renderApp('/app/riverton/service-agreements/new');
    const modal = await screen.findByRole(
      'dialog',
      { name: /new service agreement/i },
      { timeout: 32000 },
    );
    expect(within(modal).getByLabelText(/title/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText(/description/i)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /create agreement/i })).toBeInTheDocument();
  });

  it('Should drive the paginated browse API from the search + sort controls', async () => {
    const fetchMock = mockServiceAgreementsBff(workspaceAgreement, {
      testFile: 'service-agreements-console.e2e.test',
      agreements,
    });
    renderApp('/app/riverton/service-agreements/');
    await screen.findByRole('link', { name: 'Terms of service' }, { timeout: 32000 });
    const user = userEvent.setup();
    const pageCall = (predicate: (url: string) => boolean) =>
      fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return url.includes('/v1/service-agreements/page') && predicate(url);
      });
    // Default browse carries paging + default sort, scoped to the workspace.
    expect(pageCall((url) => url.includes('workspaceId=') && url.includes('sort=updated'))).toBe(
      true,
    );
    await user.type(screen.getByRole('searchbox'), 'priv');
    await waitFor(() => expect(pageCall((url) => url.includes('q=priv'))).toBe(true));
    await user.click(screen.getByRole('button', { name: /sort by title/i }));
    await waitFor(() => expect(pageCall((url) => url.includes('sort=title'))).toBe(true));
  });

  it('Should admin surface lists global agreements only', async () => {
    const admin = { ...authedUser, roles: ['admin'] };
    mockServiceAgreementsBff(workspaceAgreement, {
      testFile: 'service-agreements-console.e2e.test',
      agreements,
      user: admin,
    });
    renderApp('/admin/service-agreements/');
    expect(
      await screen.findByRole('link', { name: 'Privacy policy' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Terms of service' })).not.toBeInTheDocument();
  });
});
