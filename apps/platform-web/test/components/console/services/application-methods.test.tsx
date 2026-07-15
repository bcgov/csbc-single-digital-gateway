import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ApplicationMethods } from '@/components/console/services/application-methods';
import { archiveReference, removeReference, type ServiceReference } from '@/lib/services';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, params, children, ...props }: any) => {
    let href = to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/lib/services', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/services')>();
  return {
    ...original,
    removeReference: vi.fn(),
    archiveReference: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
});

const mockReferences: ServiceReference[] = [
  {
    id: 'ref-basic-123',
    relation: 'application_form',
    position: 0,
    label: 'Apply here',
    targetDocumentId: 'doc-basic-789',
    targetVersionId: 'v-basic-1',
    targetKind: 'basic-form',
    targetTitle: 'Parking Application Form',
    targetVersion: 1,
    targetStatus: 'draft',
    hasSubmissions: false,
    hasStructure: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'ref-multi-123',
    relation: 'application_form',
    position: 1,
    label: 'Apply now stage',
    targetDocumentId: 'doc-multi-789',
    targetVersionId: 'v-multi-1',
    targetKind: 'multi-stage-form',
    targetTitle: 'Complex Permit Form',
    targetVersion: 1,
    targetStatus: 'draft',
    hasSubmissions: true,
    hasStructure: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'ref-archived-123',
    relation: 'application_form',
    position: 2,
    label: 'Old reference',
    targetDocumentId: 'doc-archived-789',
    targetVersionId: 'v-archived-1',
    targetKind: 'basic-form',
    targetTitle: 'Archived Form',
    targetVersion: 1,
    targetStatus: 'archived',
    hasSubmissions: true,
    hasStructure: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

function renderApplicationMethods(props: {
  slug?: string;
  serviceId?: string;
  versionId?: string;
  references: ServiceReference[];
  readonly?: boolean;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ApplicationMethods
        slug={props.slug ?? 'riverton'}
        serviceId={props.serviceId ?? 'srv-123'}
        versionId={props.versionId ?? 'v-456'}
        references={props.references}
        readonly={props.readonly ?? false}
      />
    </QueryClientProvider>,
  );
}

describe('ApplicationMethods', () => {
  it('renders empty state message when there are no references', () => {
    renderApplicationMethods({ references: [] });

    expect(
      screen.getByText('No application methods yet — add a form a user can apply through.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add application method/i })).toBeInTheDocument();
  });

  it('does not render add button when readonly is true', () => {
    renderApplicationMethods({ references: [], readonly: true });

    expect(
      screen.queryByRole('button', { name: /add application method/i }),
    ).not.toBeInTheDocument();
  });

  it('renders list of application methods with details', () => {
    renderApplicationMethods({ references: mockReferences });

    // Verify titles are present
    expect(screen.getByText('Parking Application Form')).toBeInTheDocument();
    expect(screen.getByText('Complex Permit Form')).toBeInTheDocument();
    expect(screen.getByText('Archived Form')).toBeInTheDocument();

    // Verify labels and kind descriptions
    expect(screen.getByText('Apply here · Basic form')).toBeInTheDocument();
    expect(screen.getByText('Apply now stage · Multi-stage form')).toBeInTheDocument();
    expect(screen.getByText('Old reference · Basic form')).toBeInTheDocument();

    // Verify Archived badge is present
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders archived method as text and active method as link', () => {
    renderApplicationMethods({ references: mockReferences });

    // Parking Application Form is active, should be a link
    const activeLink = screen.getByRole('link', { name: 'Parking Application Form' });
    expect(activeLink).toBeInTheDocument();
    expect(activeLink.getAttribute('href')).toBe(
      '/app/riverton/services/srv-123/versions/v-456/application-methods/doc-basic-789',
    );

    // Archived Form should not be a link
    const archivedText = screen.getByText('Archived Form');
    expect(archivedText).toBeInTheDocument();
    expect(archivedText.tagName).not.toBe('A');
    expect(screen.queryByRole('link', { name: 'Archived Form' })).not.toBeInTheDocument();
  });

  it('handles Add application method button click and navigates', async () => {
    const user = userEvent.setup();
    renderApplicationMethods({ references: [] });

    const addButton = screen.getByRole('button', { name: /add application method/i });
    await user.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/$slug/services/$id/versions/$versionId/application-methods/new',
        params: {
          slug: 'riverton',
          id: 'srv-123',
          versionId: 'v-456',
        },
      }),
    );
  });

  it('handles Archive button click and calls archive mutation', async () => {
    vi.mocked(archiveReference).mockResolvedValueOnce();
    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveButton);

    expect(archiveReference).toHaveBeenCalledWith('srv-123', 'v-456', 'ref-multi-123');
  });

  it('handles Delete button click, opens confirmation dialog, can cancel, and can delete', async () => {
    vi.mocked(removeReference).mockResolvedValueOnce();
    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Dialog should be open
    const dialogTitle = await screen.findByText('Delete this application method?');
    expect(dialogTitle).toBeInTheDocument();

    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(screen.queryByText('Delete this application method?')).not.toBeInTheDocument();
    expect(removeReference).not.toHaveBeenCalled();

    // Open again and delete
    await user.click(deleteButton);
    const confirmDeleteButton = await screen.findByRole('button', { name: /^delete$/i });
    await user.click(confirmDeleteButton);

    await waitFor(() => {
      expect(removeReference).toHaveBeenCalledWith('srv-123', 'v-456', 'ref-basic-123');
    });
  });

  it('displays error message when mutation fails', async () => {
    vi.mocked(archiveReference).mockRejectedValueOnce(new Error('Failed to archive method'));
    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveButton);

    const errorMessage = await screen.findByRole('alert');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Failed to archive method');
  });
});
