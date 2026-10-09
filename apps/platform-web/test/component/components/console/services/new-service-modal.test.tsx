import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewServiceModal } from '@/components/console/services/new-service-modal';
import { createService } from '@/lib/services';
import { mockNavigate } from '../../../../support/vi-fixtures';

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

const mockOnOpenChange = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'riverton' }),
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/services', () => ({
  createService: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

// @jsonforms/react debounces onChange (~10ms), so give the controlled data a beat to flush from the
// last keystroke before submitting (memory: jsonforms-onchange-debounce).
const flushDebounce = () => new Promise((resolve) => setTimeout(resolve, 100));

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
  it('Should render the JSONForms layout and disable submit when workspace is loading', async () => {
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

  it('Should enable submit button when workspace is loaded', async () => {
    renderNewServiceModal(true);

    const submitBtn = await screen.findByRole('button', { name: /create service/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('Should submit the fields, calls createService, and navigate on success', async () => {
    const user = userEvent.setup();
    const createdResult = {
      service: { id: 'srv-999', workspaceId: 'w1', title: 'Permit Office' },
      versions: [],
    };
    vi.mocked(createService).mockResolvedValueOnce(createdResult as any);

    renderNewServiceModal(true);

    const titleInput = await screen.findByLabelText(/name of the service/i);
    fireEvent.change(titleInput, { target: { value: 'Business License' } });
    fireEvent.change(descInput(), { target: { value: 'Apply for business license' } });
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

  it('Should close the modal (onOpenChange false) when clicking cancel', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Should display an error message when service creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(createService).mockRejectedValueOnce(new Error('Service title is taken'));

    renderNewServiceModal(true);

    const titleInput = await screen.findByLabelText(/name of the service/i);
    fireEvent.change(titleInput, { target: { value: 'Permit Office' } });
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Service title is taken');
  });

  it('Should show a validation error when submitting with empty untouched form', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    const submitBtn = await screen.findByRole('button', { name: /create service/i });
    await user.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('A title is required');
    expect(createService).not.toHaveBeenCalled();
  });

  it('Should submit successfully when description is omitted', async () => {
    const user = userEvent.setup();
    const createdResult = {
      service: { id: 'srv-888', workspaceId: 'w1', title: 'Permits Only' },
      versions: [],
    };
    vi.mocked(createService).mockResolvedValueOnce(createdResult as any);

    renderNewServiceModal(true);

    const titleInput = await screen.findByLabelText(/name of the service/i);
    fireEvent.change(titleInput, { target: { value: 'Permits Only' } });
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    await waitFor(() => {
      expect(createService).toHaveBeenCalledWith({
        workspaceId: 'w1',
        title: 'Permits Only',
        data: { title: 'Permits Only', description: '' },
        applications: [],
      });
    });
  });

  it('Should show a validation error when submitting a whitespace-only name', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    const titleInput = await screen.findByLabelText(/name of the service/i);
    fireEvent.change(titleInput, { target: { value: '   ' } });
    await flushDebounce();
    await user.click(screen.getByRole('button', { name: /create service/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A title is required');
    expect(createService).not.toHaveBeenCalled();
  });

  it('Should show an error when submitting with no active workspace', async () => {
    renderNewServiceModal(false);

    const titleInput = await screen.findByLabelText(/name of the service/i);
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    await flushDebounce();

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No active workspace');
    expect(createService).not.toHaveBeenCalled();
  });

  it('Should close the modal when Dialog triggers onOpenChange(false)', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.keyboard('{Escape}');

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('Should show a spinner and disable submit while creation is pending', async () => {
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

  it('Should invalidate services queries on successful creation', async () => {
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

  it('Should not close the modal when Dialog triggers onOpenChange(true)', async () => {
    const user = userEvent.setup();
    renderNewServiceModal(true);

    await user.click(screen.getByTestId('trigger-open-true'));

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
});
