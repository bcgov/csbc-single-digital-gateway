import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceSwitcher } from '@/components/console/workspace-switcher';
import { useWorkspaces } from '@/lib/workspaces';

let mockParamsSlug: string | undefined = 'riverton';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...props }: any) => {
    const href = to.replace('$slug', params?.slug ?? '');
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  useParams: vi.fn(() => ({ slug: mockParamsSlug })),
}));

vi.mock('@/lib/workspaces', () => ({
  useWorkspaces: vi.fn(),
}));

vi.mock('@/components/console/create-workspace-modal', () => ({
  CreateWorkspaceModal: ({ open, onOpenChange }: any) => {
    if (!open) return null;
    return (
      <div data-testid="mock-create-modal">
        Mock Workspace Modal
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    );
  },
}));

function renderSwitcher(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceSwitcher />
    </QueryClientProvider>,
  );
}

describe('WorkspaceSwitcher Component Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockParamsSlug = 'riverton';
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('renders No workspace when workspaces list is empty', () => {
    vi.mocked(useWorkspaces).mockReturnValue({ data: [] } as any);
    renderSwitcher(queryClient);

    expect(screen.getByText('No workspace')).toBeInTheDocument();
  });

  it('renders Select workspace when workspaces exist but none match active slug', () => {
    vi.mocked(useWorkspaces).mockReturnValue({
      data: [
        { id: 'w-1', slug: 'riverton', name: 'Riverton' },
        { id: 'w-2', slug: 'burnaby', name: 'Burnaby' },
      ],
    } as any);
    mockParamsSlug = 'surrey';

    renderSwitcher(queryClient);

    expect(screen.getByText('Select workspace')).toBeInTheDocument();
  });

  it('renders active workspace name, and displays list and active check icon in dropdown', async () => {
    vi.mocked(useWorkspaces).mockReturnValue({
      data: [
        { id: 'w-1', slug: 'riverton', name: 'Riverton' },
        { id: 'w-2', slug: 'burnaby', name: 'Burnaby' },
      ],
    } as any);
    mockParamsSlug = 'riverton';

    renderSwitcher(queryClient);

    // Verify trigger shows active workspace name
    const trigger = screen.getByRole('button', { name: /Riverton/i });
    expect(trigger).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(trigger);

    // Verify dropdown lists both workspaces with correct links
    const linkRiverton = screen.getByRole('menuitem', { name: /Riverton/i });
    const linkBurnaby = screen.getByRole('menuitem', { name: /Burnaby/i });
    expect(linkRiverton).toHaveAttribute('href', '/app/riverton');
    expect(linkBurnaby).toHaveAttribute('href', '/app/burnaby');

    // Verify Check icon is rendered next to active workspace
    // Check is rendering lucide icon with class Check or similar. We can check for its presence in DOM.
    expect(linkRiverton.querySelector('.lucide-check')).toBeInTheDocument();
    expect(linkBurnaby.querySelector('.lucide-check')).not.toBeInTheDocument();
  });

  it('shows no workspaces message in dropdown when empty', async () => {
    vi.mocked(useWorkspaces).mockReturnValue({ data: [] } as any);
    renderSwitcher(queryClient);

    const trigger = screen.getByRole('button', { name: /No workspace/i });
    fireEvent.click(trigger);

    expect(await screen.findByText('No workspaces yet')).toBeInTheDocument();
  });

  it('opens and closes create workspace modal from the dropdown', async () => {
    const user = userEvent.setup();
    vi.mocked(useWorkspaces).mockReturnValue({ data: [] } as any);
    renderSwitcher(queryClient);

    const trigger = screen.getByRole('button', { name: /No workspace/i });
    fireEvent.click(trigger);

    const createBtn = await screen.findByRole('menuitem', { name: /Create workspace/i });
    await user.click(createBtn);

    // Verify create workspace modal is mounted
    expect(await screen.findByTestId('mock-create-modal')).toBeInTheDocument();

    // Click close inside the mock modal
    const closeBtn = screen.getByRole('button', { name: 'Close Modal' });
    await user.click(closeBtn);

    // Verify modal is unmounted
    expect(screen.queryByTestId('mock-create-modal')).not.toBeInTheDocument();
  });
});
