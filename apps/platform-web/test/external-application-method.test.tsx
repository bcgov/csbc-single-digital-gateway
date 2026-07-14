import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationMethods } from '@/components/console/services/application-methods';
import {
  ExternalApplicationForm,
  isHttpsUrl,
} from '@/components/console/services/external-application-form';
import type { ServiceReference } from '@/lib/services';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-07-14T00:00:00.000Z';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const externalRef: ServiceReference = {
  id: 'ref-ext',
  relation: 'external_application',
  position: 0,
  label: 'Apply on GOV.UK',
  url: 'https://gov.uk/apply',
  targetDocumentId: 'ext-doc',
  targetVersionId: 'ext-ver',
  targetKind: 'external-application',
  targetTitle: 'Apply on GOV.UK',
  targetVersion: 1,
  targetStatus: 'draft',
  hasSubmissions: false,
  hasStructure: true,
  createdAt: ISO,
};

function renderMethods(references: ServiceReference[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <ApplicationMethods
        slug="riverton"
        serviceId="s1"
        versionId="sv1"
        references={references}
        readonly={false}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('isHttpsUrl', () => {
  it('accepts absolute https and rejects everything else', () => {
    expect(isHttpsUrl('https://gov.uk/apply')).toBe(true);
    expect(isHttpsUrl('http://gov.uk')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('/relative')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
  });
});

describe('ExternalApplicationForm', () => {
  it('gates submit on a label + a valid https url and emits trimmed values', async () => {
    const onSubmit = vi.fn();
    render(
      <ExternalApplicationForm
        submitLabel="Add link"
        submitting={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const submit = screen.getByRole('button', { name: 'Add link' });
    expect(submit).toBeDisabled();
    // BC-branded placeholders.
    expect(screen.getByLabelText('Label')).toHaveAttribute('placeholder', 'Apply at gov.bc.ca');
    expect(screen.getByLabelText('Link URL')).toHaveAttribute('placeholder', 'https://gov.bc.ca');

    await userEvent.type(screen.getByLabelText('Label'), '  Apply on GOV.UK  ');
    // A non-https url keeps submit disabled.
    await userEvent.type(screen.getByLabelText('Link URL'), 'http://gov.uk');
    expect(submit).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Link URL'));
    await userEvent.type(screen.getByLabelText('Link URL'), '  https://gov.uk/apply  ');
    expect(submit).toBeEnabled();

    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({
      label: 'Apply on GOV.UK',
      url: 'https://gov.uk/apply',
    });
  });
});

describe('ApplicationMethods — external method row', () => {
  it('renders an external method with its url and no builder link', async () => {
    renderMethods([externalRef]);
    expect(await screen.findByText('Apply on GOV.UK')).toBeInTheDocument();
    expect(screen.getByText('https://gov.uk/apply')).toBeInTheDocument();
    // External methods have no builder page, so the title is not a link.
    expect(screen.queryByRole('link', { name: 'Apply on GOV.UK' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('edits an external method via the dialog (prefilled) and PATCHes external-applications', async () => {
    const fetchMock = vi.fn(async () => json({ ...externalRef, url: 'https://gov.uk/new' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    renderMethods([externalRef]);
    await screen.findByText('Apply on GOV.UK');

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByRole('dialog', { name: /edit external link/i });
    // Prefilled from the reference.
    expect(within(dialog).getByLabelText('Label')).toHaveValue('Apply on GOV.UK');
    expect(within(dialog).getByLabelText('Link URL')).toHaveValue('https://gov.uk/apply');

    const urlInput = within(dialog).getByLabelText('Link URL');
    await userEvent.clear(urlInput);
    await userEvent.type(urlInput, 'https://gov.uk/new');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/versions/sv1/external-applications/ref-ext'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
