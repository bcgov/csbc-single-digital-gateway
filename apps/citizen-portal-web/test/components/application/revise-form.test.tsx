import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReviseForm } from '@/components/application/revise-form';
import type { ApplicationDetail } from '@/lib/applications';

const mockApplication: ApplicationDetail = {
  id: 'sub123',
  reference: '20260708-0001',
  status: 'draft',
  statusLabel: 'Draft',
  formId: 'form-abc',
  formVersionId: 'form-ver-xyz',
  formTitle: 'Edit Details',
  serviceId: 'service-789',
  serviceTitle: 'Test Service',
  kind: 'basic-form',
  structure: {
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
  data: { name: 'Initial Name' },
  reviewReason: null,
  createdAt: '2026-07-08T12:00:00.000Z',
  updatedAt: '2026-07-08T12:00:00.000Z',
  submittedAt: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ReviseForm Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const renderComponent = (
    props: {
      application?: ApplicationDetail;
      onSubmitted?: () => void;
      onCancel?: () => void;
    } = {},
  ) => {
    const defaultProps = {
      application: mockApplication,
      onSubmitted: vi.fn(),
      onCancel: vi.fn(),
    };
    const combinedProps = { ...defaultProps, ...props };
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <ReviseForm
            application={combinedProps.application}
            onSubmitted={combinedProps.onSubmitted}
            onCancel={combinedProps.onCancel}
          />
        </QueryClientProvider>,
      ),
      props: combinedProps,
    };
  };

  it('renders initial form data correctly', () => {
    renderComponent();
    expect(screen.getByLabelText('Name')).toHaveValue('Initial Name');
    expect(screen.getByRole('button', { name: 'Resubmit application' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    renderComponent({ onCancel });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('performs debounced autosave when name is modified', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ...mockApplication, data: { name: 'Updated' } }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderComponent();

    const input = screen.getByLabelText('Name');
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated');

    // Wait for the 800ms debounce timer to fire and trigger the PATCH request
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/me/applications/sub123'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ data: { name: 'Updated' } }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Draft saved')).toBeInTheDocument();
    });
  }, 10000);

  it('submits application successfully and calls onSubmitted', async () => {
    const onSubmitted = vi.fn();
    const fetchMock = vi.fn(async () => jsonResponse({ ...mockApplication, status: 'pending' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderComponent({ onSubmitted });

    await userEvent.click(screen.getByRole('button', { name: 'Resubmit application' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/me/applications/sub123/submit'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: { name: 'Initial Name' } }),
        }),
      );
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('shows error message if submit fails', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 400 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: 'Resubmit application' }));

    await waitFor(() => {
      expect(screen.getByText('Could not submit — please try again.')).toBeInTheDocument();
    });
  });
});
