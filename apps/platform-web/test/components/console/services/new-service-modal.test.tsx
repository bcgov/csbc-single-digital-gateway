import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewServiceModal } from '@/components/console/services/new-service-modal';
import { createService } from '@/lib/services';

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
  vi.restoreAllMocks();
  mockNavigate.mockClear();
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
});
