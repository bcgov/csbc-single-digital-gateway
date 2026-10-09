import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../support/render-app';
import { ISO } from '../support/fixtures';
import { mockServicesBff } from '../support/mock-services-bff';
import { service } from '../support/testHelpers';

afterEach(() => {
  vi.restoreAllMocks();
});

const definition = {
  schema: {
    type: 'object',
    required: ['title'],
    properties: { title: { type: 'string', title: 'Title' } },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/title' }],
  },
};

const draftVersion = {
  id: 'sv1',
  documentId: 's1',
  version: 1,
  status: 'draft' as const,
  data: { title: 'Permit application' },
  createdAt: ISO,
  publishedAt: null,
  archivedAt: null,
};

describe('Console Services Integration Test Suite', () => {
  it('lists a workspace’s services', async () => {
    mockServicesBff(service(), { user: authedUser, definition, draftVersion });
    renderApp('/app/riverton/services/');
    expect(
      await screen.findByRole('link', { name: /permit application/i }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('requests the paged list with the default sort', async () => {
    const fetchMock = mockServicesBff(service(), { user: authedUser, definition, draftVersion });
    renderApp('/app/riverton/services');
    await screen.findByRole('link', { name: /permit application/i }, { timeout: 32000 });

    // Default list request carries the paging window + default sort (no search/sort UI anymore).
    const listCall = (predicate: (url: string) => boolean) =>
      fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return url.includes('/v1/services?') && predicate(url);
      });
    expect(listCall((url) => url.includes('sort=updated') && url.includes('limit=20'))).toBe(true);
  });

  it('opens the New service modal (title + description) from the services list New button', async () => {
    mockServicesBff(service(), { user: authedUser, definition, draftVersion });
    renderApp('/app/riverton/services');
    const user = userEvent.setup();

    const newButton = await screen.findByRole('button', { name: /^new$/i }, { timeout: 32000 });
    await waitFor(() => expect(newButton).toBeEnabled());
    await user.click(newButton);

    // The modal + its JSONForms bundle are lazy-loaded on click — allow for the first compile.
    const modal = await screen.findByRole('dialog', { name: /new service/i }, { timeout: 32000 });
    expect(within(modal).getByLabelText(/name of the service/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText('Short description')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /create service/i })).toBeInTheDocument();
  });

  it('tabs the detail, lists methods, and publishes via the summary modal', async () => {
    const fetchMock = mockServicesBff(service(), { user: authedUser, definition, draftVersion });
    renderApp('/app/riverton/services/s1/old/edit');
    const user = userEvent.setup();

    // Service details tab (default): the JSONForms title control.
    expect(
      await screen.findByLabelText(/title/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Application methods tab: the method list (count badge + form title).
    await user.click(screen.getByRole('tab', { name: /application methods/i }));
    expect(
      await screen.findByText('Permit form', undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add application method/i })).toBeInTheDocument();

    // Service agreements tab: a count badge (0) + its panel (empty state) — guards the tab wiring.
    expect(screen.getByRole('tab', { name: /service agreements\s*0/i })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /service agreements/i }));
    expect(
      await screen.findByText(/no agreements attached to this service/i, undefined, {
        timeout: 32000,
      }),
    ).toBeInTheDocument();

    // Publish through the summary modal (no unsaved changes ⇒ the Publish trigger is enabled).
    await user.click(screen.getByRole('tab', { name: /service details/i }));
    await user.click(
      await screen.findByRole('button', { name: 'Publish service' }, { timeout: 32000 }),
    );
    const modal = await screen.findByRole(
      'dialog',
      { name: /publish service/i },
      { timeout: 32000 },
    );
    await user.click(within(modal).getByRole('button', { name: 'Publish' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/services/s1/versions/sv1/publish'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });
});
