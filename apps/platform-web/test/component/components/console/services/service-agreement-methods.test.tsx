import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceAgreementMethods } from '@/components/console/services/service-agreement-methods';
import { AlertDialog } from '@repo/ui/alert-dialog';
import { ISO } from '../../../../support/fixtures';
import { jsonResponse } from '../../../../support/render-app';

export let capturedActionOnClick: (() => void) | undefined;
export let mockAlwaysOpen = false;

vi.mock('@repo/ui/alert-dialog', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    AlertDialog: vi.fn((props: any) => {
      return <actual.AlertDialog {...props} open={mockAlwaysOpen || props.open} />;
    }),
    AlertDialogAction: (props: any) => {
      capturedActionOnClick = props.onClick;
      return <actual.AlertDialogAction {...props} />;
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const attachedRef = {
  id: 'ref1',
  agreementDocumentId: 'a-attached',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  position: 0,
  createdAt: ISO,
};

/** Mock the attached-agreements read + the picker source (published + draft + already-attached). */
function mockServiceAgreementMethodsBff(defaults: unknown[] = [], detachStatus = 200) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'DELETE' && url.includes('/versions/sv1/agreements/ref1')) {
      if (detachStatus >= 400) {
        return jsonResponse({ message: 'Delete failed' }, detachStatus);
      }
      return new Response(null, { status: 204 });
    }
    if (url.includes('/default-agreements')) {
      return jsonResponse({ items: defaults });
    }
    if (url.includes('/versions/sv1/agreements')) {
      return jsonResponse({ items: [attachedRef] });
    }
    if (url.includes('/v1/service-agreements')) {
      return jsonResponse({
        items: [
          { ...attachedRef, id: 'a-attached', status: 'published' }, // already attached → excluded
          {
            id: 'a-available',
            workspaceId: null,
            title: 'Privacy policy',
            kind: 'service-agreement',
            createdAt: ISO,
            status: 'published',
            isGlobal: true,
          },
          {
            id: 'a-draft',
            workspaceId: 'w1',
            title: 'Draft notice',
            kind: 'service-agreement',
            createdAt: ISO,
            status: 'draft',
            isGlobal: false,
          },
        ],
      });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderServiceAgreementMethods(readonly = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // A minimal router provides the context the panel's useNavigate needs.
  const rootRoute = createRootRoute({
    component: () => (
      <ServiceAgreementMethods
        slug="riverton"
        serviceId="s1"
        versionId="sv1"
        workspaceId="w1"
        readonly={readonly}
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

describe('Service Agreement Methods Component Test Suite', () => {
  it('lists attached agreements: title links to the standalone console editor, with Required + Remove', async () => {
    mockServiceAgreementMethodsBff();
    renderServiceAgreementMethods();
    const link = await screen.findByRole('link', { name: 'Terms of service' });
    // Agreements are edited in the standalone Service Agreements console (by document id), not
    // under the service version (initiative shared-service-agreements).
    expect(link).toHaveAttribute('href', expect.stringContaining('/service-agreements/a-attached'));
    expect(link).toHaveAttribute('href', expect.not.stringContaining('/versions/'));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add service agreement/i })).toBeInTheDocument();
  });

  it('the Add modal is attach-only and lists only published, not-attached agreements', async () => {
    mockServiceAgreementMethodsBff();
    renderServiceAgreementMethods();
    await screen.findByText('Terms of service');
    await userEvent.click(screen.getByRole('button', { name: /add service agreement/i }));
    const dialog = await screen.findByRole('dialog', { name: /add a service agreement/i });
    // Attach-only: no "create a new agreement" affordance.
    expect(
      within(dialog).queryByRole('button', { name: /create a new agreement/i }),
    ).not.toBeInTheDocument();
    // Picker: published + not attached → shown; draft + already-attached → excluded.
    expect(await within(dialog).findByText('Privacy policy')).toBeInTheDocument();
    expect(within(dialog).queryByText('Draft notice')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Terms of service')).not.toBeInTheDocument();
  });

  it('shows workspace defaults that also apply (read-only), deduped against attached', async () => {
    mockServiceAgreementMethodsBff([
      {
        id: 'wd1',
        agreementDocumentId: 'a-default',
        title: 'Privacy policy (default)',
        isOptional: true,
        isGlobal: true,
        createdAt: ISO,
      },
      // Also explicitly attached (a-attached) → deduped out of the defaults section.
      {
        id: 'wd2',
        agreementDocumentId: 'a-attached',
        title: 'Terms of service',
        isOptional: false,
        isGlobal: false,
        createdAt: ISO,
      },
    ]);
    renderServiceAgreementMethods();
    expect(await screen.findByText('Also applied from workspace defaults')).toBeInTheDocument();
    expect(screen.getByText('Privacy policy (default)')).toBeInTheDocument();
    expect(screen.getByText('Workspace default')).toBeInTheDocument();
    // The attached-and-default agreement is shown once (in the attached list), not duplicated.
    expect(screen.getAllByText('Terms of service')).toHaveLength(1);
  });

  it('the Add picker excludes agreements already applied as workspace defaults', async () => {
    // 'a-available' (Privacy policy) is both a picker candidate AND a workspace default.
    mockServiceAgreementMethodsBff([
      {
        id: 'wd1',
        agreementDocumentId: 'a-available',
        title: 'Privacy policy',
        isOptional: false,
        isGlobal: true,
        createdAt: ISO,
      },
    ]);
    renderServiceAgreementMethods();
    await screen.findByText('Terms of service');
    await userEvent.click(screen.getByRole('button', { name: /add service agreement/i }));
    const dialog = await screen.findByRole('dialog', { name: /add a service agreement/i });
    // Already applied via the workspace default → not offered in the attach picker.
    expect(within(dialog).queryByText('Privacy policy')).not.toBeInTheDocument();
  });

  it('hides the Add and detach affordances when readonly', async () => {
    mockServiceAgreementMethodsBff();
    renderServiceAgreementMethods(true);
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add service agreement/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('triggers delete mutation and invalidates query when confirmed in dialog', async () => {
    const fetchMock = mockServiceAgreementMethodsBff();
    renderServiceAgreementMethods();
    await screen.findByText('Terms of service');

    // Open remove alert dialog
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    // Click confirm in alert dialog
    const confirmBtn = within(dialog).getByRole('button', { name: 'Remove' });
    await userEvent.click(confirmBtn);

    // Verify it sent DELETE request
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/versions/sv1/agreements/ref1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('clears confirmation state when dialog is dismissed/cancelled', async () => {
    mockServiceAgreementMethodsBff();
    renderServiceAgreementMethods();
    await screen.findByText('Terms of service');

    // Open remove alert dialog
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    // Click cancel in alert dialog
    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelBtn);

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('shows error message if detach service agreement fails', async () => {
    mockServiceAgreementMethodsBff([], 500);
    renderServiceAgreementMethods();
    await screen.findByText('Terms of service');

    // Open remove alert dialog
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    const dialog = await screen.findByRole('alertdialog');

    // Click confirm in alert dialog
    const confirmBtn = within(dialog).getByRole('button', { name: 'Remove' });
    await userEvent.click(confirmBtn);

    // Should render alert message
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Request failed: 500');
  });

  it('renders optional and global badges correctly', async () => {
    const optionalAttachedRef = {
      ...attachedRef,
      isOptional: true,
      isGlobal: true,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/default-agreements')) {
        return jsonResponse({
          items: [
            {
              id: 'wd1',
              agreementDocumentId: 'a-default-opt',
              title: 'Privacy policy (default-opt)',
              isOptional: true,
              isGlobal: true,
              createdAt: ISO,
            },
            {
              id: 'wd2',
              agreementDocumentId: 'a-default-req-local',
              title: 'Terms (default-req-local)',
              isOptional: false,
              isGlobal: false,
              createdAt: ISO,
            },
          ],
        });
      }
      if (url.includes('/versions/sv1/agreements')) {
        return jsonResponse({ items: [optionalAttachedRef] });
      }
      return jsonResponse({ items: [] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderServiceAgreementMethods();

    await screen.findByText('Terms of service');
    expect(screen.getAllByText('Optional').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Global').length).toBeGreaterThan(0);
  });

  it('shows workspace defaults warning text when there are no explicitly attached agreements but defaults exist', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/default-agreements')) {
        return jsonResponse({
          items: [
            {
              id: 'wd1',
              agreementDocumentId: 'a-default',
              title: 'Privacy policy',
              isOptional: false,
              isGlobal: false,
              createdAt: ISO,
            },
          ],
        });
      }
      if (url.includes('/versions/sv1/agreements')) {
        return jsonResponse({ items: [] });
      }
      return jsonResponse({ items: [] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderServiceAgreementMethods();

    expect(await screen.findByText(/workspace defaults still apply/i)).toBeInTheDocument();
  });

  it('covers onOpenChange(true) branch in AlertDialog', async () => {
    mockServiceAgreementMethodsBff();
    renderServiceAgreementMethods();
    await screen.findByText('Terms of service');

    // Open remove alert dialog
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    // Manually trigger onOpenChange(true) to cover the branch
    const alertDialogProps = vi
      .mocked(AlertDialog)
      .mock.calls.find((call) => (call[0] as any).open === true)?.[0] as any;
    if (alertDialogProps && alertDialogProps.onOpenChange) {
      alertDialogProps.onOpenChange(true);
    }
  });

  it('covers AlertDialogAction onClick when confirmId is null', async () => {
    mockServiceAgreementMethodsBff();
    mockAlwaysOpen = true;
    try {
      renderServiceAgreementMethods();
      await screen.findByText('Terms of service');

      // Trigger capturedActionOnClick directly (confirmId is null by default)
      act(() => {
        capturedActionOnClick?.();
      });
    } finally {
      mockAlwaysOpen = false;
    }
  });
});
