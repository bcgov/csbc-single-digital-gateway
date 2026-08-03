import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviseForm } from '@/components/application/revise-form';
import type { ApplicationDetail } from '@/lib/applications';

vi.mock('@repo/react/form-runner', () => ({
  FormRunner: ({ data, onChange, onSubmit, submitLabel, submitting }: any) => (
    <div>
      <label htmlFor="mock-input">Name</label>
      <input
        id="mock-input"
        type="text"
        value={data.name || ''}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
      />
      <button disabled={submitting} onClick={() => onSubmit(data)}>
        {submitLabel}
      </button>
    </div>
  ),
}));

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
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
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
    fireEvent.change(input, { target: { value: 'Updated' } });

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

  it('handles undefined initial data gracefully', () => {
    const mockAppNoData = { ...mockApplication, data: undefined };
    renderComponent({ application: mockAppNoData as any });
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('performs debounced autosave with multiple changes, clearing previous timers', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ...mockApplication, data: { name: 'Updated name' } }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderComponent();

    const input = screen.getByLabelText('Name');

    // Trigger first change
    fireEvent.change(input, { target: { value: 'U' } });

    // Wait 100ms (less than 800ms debounce)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger second change, which should clear the first timer
    fireEvent.change(input, { target: { value: 'Up' } });

    // Wait for the final save to complete
    expect(await screen.findByText('Draft saved', {}, { timeout: 2000 })).toBeInTheDocument();

    // Verify it was never called with the intermediate value 'U'
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ data: { name: 'U' } }),
      }),
    );

    // Verify it was called with the final value 'Up'
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ data: { name: 'Up' } }),
      }),
    );
  });

  it('shows saving indicator when autosave is pending', async () => {
    let resolvePatch: (value: Response) => void;
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });

    const fetchMock = vi.fn(async () => patchPromise);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderComponent();

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'New Name' } });

    expect(await screen.findByText('Saving…', {}, { timeout: 2000 })).toBeInTheDocument();

    await act(async () => {
      resolvePatch(jsonResponse(mockApplication));
    });

    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
  });

  it('cancels pending autosave timer on submit', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ...mockApplication, status: 'pending' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderComponent();

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Typing and submitting' } });

    // Click submit immediately
    const submitBtn = screen.getByRole('button', { name: 'Resubmit application' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/me/applications/sub123/submit'),
        expect.any(Object),
      );
    });

    // The autosave PATCH should not have been called because submit cleared the timer
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/applications/sub123'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
