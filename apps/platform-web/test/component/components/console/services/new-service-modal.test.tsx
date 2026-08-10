import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewServiceModal } from '@/components/console/services/new-service-modal';
import { createService } from '@/lib/services';

vi.mock('@repo/ui/dialog', () => {
  return {
    Dialog: ({ children, onOpenChange }: any) => {
      useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            onOpenChange(false);
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [onOpenChange]);

      return (
        <div data-testid="mock-dialog">
          <button data-testid="trigger-open-true" onClick={() => onOpenChange(true)}>
            Open True
          </button>
          <button data-testid="trigger-open-false" onClick={() => onOpenChange(false)}>
            Open False
          </button>
          {children}
        </div>
      );
    },
    DialogContent: ({ children }: any) => <div data-testid="mock-dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
  };
});

const mockNavigate = vi.fn();
const mockParams = { slug: 'riverton' };
const mockOnOpenChange = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

vi.mock('@/lib/services', () => ({
  createService: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

// @jsonforms/react debounces onChange (~10ms), so give the controlled data a beat to flush from the
// last keystroke before submitting (memory: jsonforms-onchange-debounce).
const flushDebounce = () => new Promise((resolve) => setTimeout(resolve, 50));

function renderNewServiceModal(seedWorkspace = true) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  if (seedWorkspace) {
    queryClient.setQueryData(['workspaces', 'by-slug', 'riverton'], {
      id: 'w1',
      slug: 'riverton',
      name: 'Riverton',
    });
  }

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NewServiceModal open onOpenChange={mockOnOpenChange} />
    </QueryClientProvider>,
  );

  return { ...utils, queryClient };
}

const descInput = () => screen.getByLabelText('Short description');

describe('New Service Modal Component Test Suite', () => {
  it('renders the JSONForms layout and disables submit when workspace is loading', async () => {
    renderNewServiceModal(false);

    expect(screen.getByRole('heading', { name: /new service/i })).toBeInTheDocument();
    // JSONForms heading (display-only Label element).
    expect(
      await screen.findByText('Name & description', undefined, { timeout: 20000 }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/name of the service/i)).toHaveValue('');
    expect(descInput()).toHaveValue('');

    expect(screen.getByRole('button', { name: /create service/i })).toBeDisabled();
  });

  it('enables submit button when workspace is loaded', async () => {
    renderNewServiceModal(true);

    const submitBtn = await screen.findByRole('button', { name: /create service/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits the fields, calls createService, and navigates on success', async () => {
    const user = userEvent.setup();
    const createdResult = {
      service: { id: 'srv-999', workspaceId: 'w1', title: 'Permit Office' },
      versions: [],
    };
    vi.mocked(createService).mockResolvedValueOnce(createdResult as any);

    renderNewServiceModal(true);

    await user.type(await screen.findByLabelText(/name of the service/i), 'Business License');
    await flushDebounce();
    await user.type(descInput(), 'Apply for business license');
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    await waitFor(() => {
      expect(createService).toHaveBeenCalledWith({
        workspaceId: 'w1',
        title: 'Business License',
        data: { title: 'Business License', description: 'Apply for business license' },
        applications: [],
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/$slug/services/$id/old/edit',
        params: { slug: 'riverton', id: 'srv-999' },
        replace: true,
      });
    });
  });

  it('closes the modal (onOpenChange false) when clicking cancel', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays an error message when service creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(createService).mockRejectedValueOnce(new Error('Service title is taken'));

    renderNewServiceModal(true);

    await user.type(await screen.findByLabelText(/name of the service/i), 'Permit Office');
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Service title is taken');
  });

  it('shows a validation error when submitting a whitespace-only name', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.type(await screen.findByLabelText(/name of the service/i), '   ');
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A title is required');
    expect(createService).not.toHaveBeenCalled();
  });

  it('shows an error when submitting with no active workspace', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(false);

    await user.type(await screen.findByLabelText(/name of the service/i), 'Valid Title');
    await flushDebounce();

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No active workspace');
    expect(createService).not.toHaveBeenCalled();
  });

  it('closes the modal when Dialog triggers onOpenChange(false)', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.keyboard('{Escape}');

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a spinner and disables submit while creation is pending', async () => {
    let resolveCreate!: (value: any) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(createService).mockReturnValueOnce(createPromise as any);

    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.type(await screen.findByLabelText(/name of the service/i), 'New Service');
    await flushDebounce();
    const submitBtn = screen.getByRole('button', { name: /create service/i });
    await user.click(submitBtn);

    await waitFor(() => expect(submitBtn).toBeDisabled());
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

    resolveCreate({ service: { id: 'srv-123' } });
  });

  it('invalidates services queries on successful creation', async () => {
    vi.mocked(createService).mockResolvedValueOnce({ service: { id: 'srv-999' } } as any);
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.type(await screen.findByLabelText(/name of the service/i), 'Business License');
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
    });
  });

  it('does not close the modal when Dialog triggers onOpenChange(true)', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.click(screen.getByTestId('trigger-open-true'));

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
});
