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
      <NewServiceModal />
    </QueryClientProvider>,
  );

  return { ...utils, queryClient };
}

describe('NewServiceModal', () => {
  it('renders modal with initial layout and disables submit when workspace is loading', () => {
    renderNewServiceModal(false);

    expect(screen.getByRole('heading', { name: 'New service' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Give the service a title and description — you can configure the rest after it’s created.',
      ),
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('');

    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveValue('');

    const submitBtn = screen.getByRole('button', { name: /create service/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when workspace is loaded', async () => {
    renderNewServiceModal(true);

    const submitBtn = await screen.findByRole('button', { name: /create service/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits form inputs, calls createService, and navigates on success', async () => {
    const user = userEvent.setup();
    const createdResult = {
      service: { id: 'srv-999', workspaceId: 'w1', title: 'Permit Office' },
      versions: [],
    };
    vi.mocked(createService).mockResolvedValueOnce(createdResult as any);

    renderNewServiceModal(true);

    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);
    const submitBtn = screen.getByRole('button', { name: /create service/i });

    await user.type(titleInput, 'Business License');
    await user.type(descInput, 'Apply for business license');
    await user.click(submitBtn);

    // Verify createService call
    expect(createService).toHaveBeenCalledWith({
      workspaceId: 'w1',
      title: 'Business License',
      data: {
        title: 'Business License',
        description: 'Apply for business license',
      },
      applications: [],
    });

    // Wait and verify navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/$slug/services/$id',
        params: {
          slug: 'riverton',
          id: 'srv-999',
        },
        replace: true,
      });
    });
  });

  it('navigates back to services list when clicking cancel', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services',
      params: { slug: 'riverton' },
    });
  });

  it('displays error message when service creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(createService).mockRejectedValueOnce(new Error('Service title is taken'));

    renderNewServiceModal(true);

    const titleInput = screen.getByLabelText(/title/i);
    const submitBtn = screen.getByRole('button', { name: /create service/i });

    await user.type(titleInput, 'Permit Office');
    await user.click(submitBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Service title is taken');
  });

  it('displays validation error when submitting with empty or whitespace-only title', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    const titleInput = screen.getByLabelText(/title/i);
    const submitBtn = screen.getByRole('button', { name: /create service/i });

    await user.type(titleInput, '   ');
    await user.click(submitBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('A title is required');
    expect(createService).not.toHaveBeenCalled();
  });

  it('displays error when submitting form and workspaceId is missing', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(false);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Valid Title');

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();

    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form?.dispatchEvent(submitEvent);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('No active workspace');
    expect(createService).not.toHaveBeenCalled();
  });

  it('closes modal when Dialog triggers onOpenChange(false)', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.keyboard('{Escape}');

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services',
      params: { slug: 'riverton' },
    });
  });

  it('displays spinner and disables submit button when service creation is pending', async () => {
    let resolveCreate!: (value: any) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(createService).mockReturnValueOnce(createPromise as any);

    const user = userEvent.setup();
    renderNewServiceModal(true);

    const titleInput = screen.getByLabelText(/title/i);
    const submitBtn = screen.getByRole('button', { name: /create service/i });

    await user.type(titleInput, 'New Service');
    await user.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

    resolveCreate({ service: { id: 'srv-123' } });
  });

  it('invalidates services queries on successful service creation', async () => {
    vi.mocked(createService).mockResolvedValueOnce({
      service: { id: 'srv-999' },
    } as any);
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

    const user = userEvent.setup();
    renderNewServiceModal(true);

    const titleInput = screen.getByLabelText(/title/i);
    const submitBtn = screen.getByRole('button', { name: /create service/i });

    await user.type(titleInput, 'Business License');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
    });
  });

  it('does not close modal when Dialog triggers onOpenChange(true)', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    const triggerOpenTrueBtn = screen.getByTestId('trigger-open-true');
    await user.click(triggerOpenTrueBtn);

    // Navigate should not have been called since onOpenChange(true) has no effect
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
