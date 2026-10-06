import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';

// Doc 227 — delete a template or one of its versions from the detail page.

vi.mock('@repo/documents/studio', async () =>
  (await import('../../../../support/mock-documents')).documentStudioMock(),
);

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-09-28T00:00:00.000Z';
const adminUser = { id: 'u1', roles: ['admin'], claims: { sub: 'u1', name: 'Maya Reyes' } };

interface Deletable {
  template: boolean;
  reason?: string;
  versionIds: string[];
}

const version = (n: number, status: 'draft' | 'published' | 'archived') => ({
  id: `tpl-1-v${String(n)}`,
  documentId: 'tpl-1',
  versionNumber: n,
  revision: 1,
  status,
  title: 'Health service',
  description: null,
  content: {
    schema: { type: 'object', properties: {} },
    variants: { default: { type: 'Form', label: 'Health service', elements: [] } },
  },
  createdAt: ISO,
  publishedAt: status === 'draft' ? null : ISO,
  archivedAt: status === 'archived' ? ISO : null,
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A one-template API whose DELETEs mutate the store, as the real endpoints do. */
function mockApi(versions: ReturnType<typeof version>[], deletable: Deletable) {
  const store = {
    exists: true,
    versions: [...versions],
    deletable,
  };
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/auth/me')) return json(adminUser);
    if (!url.includes('/v1/admin/templates')) return new Response(null, { status: 404 });
    const segs = (url.split('/v1/admin/templates')[1] ?? '').split('/').filter(Boolean);
    const entry = {
      template: {
        id: 'tpl-1',
        workspaceId: null,
        type: 'services.service',
        createdAt: ISO,
        updatedAt: ISO,
      },
      versions: store.versions,
    };
    if (segs.length === 0) return json({ items: store.exists ? [entry] : [] });
    if (!store.exists) return new Response(null, { status: 404 });
    if (segs.length === 1 && method === 'GET')
      return json({ ...entry, deletable: store.deletable });
    if (method === 'DELETE') {
      calls.push(`DELETE /${segs.join('/')}`);
      if (segs.length === 1) {
        store.exists = false;
      } else {
        store.versions = store.versions.filter((v) => v.id !== segs[2]);
        store.deletable = { template: true, versionIds: [] };
      }
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { calls };
}

async function confirmDelete(name: RegExp) {
  const dialog = await screen.findByRole('alertdialog');
  await userEvent.click(within(dialog).getByRole('button', { name }));
}

describe('template deletion (doc 227)', () => {
  it('shows only the reason when nothing may be deleted', async () => {
    mockApi([version(1, 'published')], {
      template: false,
      reason: '2 documents use this template, so it can no longer be deleted.',
      versionIds: [],
    });
    renderApp('/admin/templates/tpl-1');

    expect(
      await screen.findByText(/2 documents use this template/, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it('deletes a single-version template and returns to the list', async () => {
    const { calls } = mockApi([version(1, 'draft')], { template: true, versionIds: [] });
    renderApp('/admin/templates/tpl-1');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }, { timeout: 32000 }),
    );
    expect(screen.getByRole('heading', { name: 'Delete this template?' })).toBeInTheDocument();
    await confirmDelete(/^Delete template$/);

    await waitFor(() => expect(calls).toEqual(['DELETE /tpl-1']));
    expect(await screen.findByText('No templates yet.')).toBeInTheDocument();
  });

  it('deletes the selected version when several remain', async () => {
    // v2 (the latest, on screen) is unreferenced; v1 is not deletable on its own.
    const { calls } = mockApi([version(1, 'archived'), version(2, 'published')], {
      template: false,
      reason: '1 document uses this template, so it can no longer be deleted.',
      versionIds: ['tpl-1-v2'],
    });
    renderApp('/admin/templates/tpl-1');

    // A PUBLISHED version is deletable when nothing is based on it.
    await userEvent.click(
      await screen.findByRole('button', { name: /Delete version 2/ }, { timeout: 32000 }),
    );
    // The template may not go, so there is no menu offering it.
    expect(screen.queryByRole('button', { name: 'More delete options' })).not.toBeInTheDocument();
    await confirmDelete(/^Delete version$/);

    await waitFor(() => expect(calls).toEqual(['DELETE /tpl-1/versions/tpl-1-v2']));
    // The selection falls back to the latest remaining version.
    expect(await screen.findByRole('button', { name: /version v1/i })).toBeInTheDocument();
  });

  it('does not ask to save after the template was deleted (doc 225 B1)', async () => {
    mockApi([version(1, 'draft')], { template: true, versionIds: [] });
    renderApp('/admin/templates/tpl-1');

    // Edit the draft, so the page is dirty and the guard would normally block leaving.
    const studio = await screen.findByTestId('document-studio', undefined, { timeout: 32000 });
    fireEvent.change(studio, {
      target: {
        value: JSON.stringify({
          schema: { type: 'object', properties: {} },
          variants: { default: { type: 'Form', label: 'Edited', elements: [] } },
        }),
      },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled());

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await confirmDelete(/^Delete template$/);

    expect(await screen.findByText('No templates yet.')).toBeInTheDocument();
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });
});
