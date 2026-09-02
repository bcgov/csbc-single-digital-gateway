import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ApplicationMethods } from '@/components/console/services/application-methods';
import { move } from '@dnd-kit/helpers';
import {
  archiveReference,
  removeReference,
  updateExternalApplication,
  type ServiceReference,
} from '@/lib/services';

export let capturedOnOpenChange: ((next: boolean) => void) | undefined;
export let capturedActionOnClick: (() => void) | undefined;
export let mockAlwaysOpen = false;

vi.mock('@repo/ui/alert-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/ui/alert-dialog')>();
  return {
    ...actual,
    AlertDialog: (props: any) => {
      capturedOnOpenChange = props.onOpenChange;
      return <actual.AlertDialog {...props} open={mockAlwaysOpen || props.open} />;
    },
    AlertDialogAction: (props: any) => {
      capturedActionOnClick = props.onClick;
      return <actual.AlertDialogAction {...props} />;
    },
  };
});

export let capturedDialogOnOpenChange: ((next: boolean) => void) | undefined;
vi.mock('@repo/ui/dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/ui/dialog')>();
  return {
    ...actual,
    Dialog: (props: any) => {
      capturedDialogOnOpenChange = props.onOpenChange;
      return <actual.Dialog {...props} />;
    },
  };
});

export let capturedOnDragEnd: ((event: any) => void) | undefined;
vi.mock('@dnd-kit/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/react')>();
  return {
    ...actual,
    DragDropProvider: (props: any) => {
      capturedOnDragEnd = props.onDragEnd;
      return <div data-testid="mock-drag-drop-provider">{props.children}</div>;
    },
  };
});

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    ref: () => {},
    handleRef: () => {},
    isDragSource: false,
  }),
}));

vi.mock('@dnd-kit/helpers', () => ({
  move: vi.fn((_, __) => {
    return {
      'application-methods': ['ref-multi-123', 'ref-basic-123'],
    };
  }),
}));

export let capturedExternalFormProps: any = null;
vi.mock('@/components/console/services/external-application-form', () => ({
  ExternalApplicationForm: (props: any) => {
    capturedExternalFormProps = props;
    return <div data-testid="external-form">Mock External Form</div>;
  },
}));

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
    updateExternalApplication: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
  capturedExternalFormProps = null;
});

const mockReferences: ServiceReference[] = [
  {
    id: 'ref-basic-123',
    relation: 'application_form',
    position: 0,
    label: 'Apply here',
    url: null,
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
    url: null,
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
    url: null,
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
  onReorder?: (orderedIds: string[]) => void;
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
        {...(props.onReorder ? { onReorder: props.onReorder } : {})}
      />
    </QueryClientProvider>,
  );
}

describe('Application Methods Component Test Suite', () => {
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
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/doc-basic-789',
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
        to: '/app/$slug/services/$id/old/edit/versions/$versionId/application-methods/new',
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

  it('does not display Archive or Delete buttons when readonly is true', () => {
    renderApplicationMethods({ references: mockReferences, readonly: true });

    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('does not display Archive or Delete buttons for archived methods', () => {
    renderApplicationMethods({ references: mockReferences });

    const archivedListItem = screen.getByText('Archived Form').closest('li');
    expect(archivedListItem).toBeInTheDocument();
    expect(archivedListItem?.querySelector('button')).toBeNull();
  });

  it('handles empty label and unknown form kind', () => {
    const referencesWithEmptyLabel: ServiceReference[] = [
      {
        id: 'ref-custom-123',
        relation: 'application_form',
        position: 0,
        label: '',
        url: null,
        targetDocumentId: 'doc-custom-789',
        targetVersionId: 'v-custom-1',
        targetKind: 'custom-form-kind',
        targetTitle: 'Custom Form',
        targetVersion: 1,
        targetStatus: 'draft',
        hasSubmissions: false,
        hasStructure: true,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ];

    renderApplicationMethods({ references: referencesWithEmptyLabel });

    expect(screen.getByText('custom-form-kind')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('disables Archive button when archive mutation is pending', async () => {
    let resolveArchive!: (value: void) => void;
    const archivePromise = new Promise<void>((resolve) => {
      resolveArchive = resolve;
    });
    vi.mocked(archiveReference).mockReturnValueOnce(archivePromise);

    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveButton);

    expect(archiveButton).toBeDisabled();

    resolveArchive();
  });

  it('disables Delete button when delete mutation is pending', async () => {
    let resolveDelete!: (value: void) => void;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    vi.mocked(removeReference).mockReturnValueOnce(deletePromise);

    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const confirmDeleteButton = await screen.findByRole('button', { name: /^delete$/i });
    await user.click(confirmDeleteButton);

    expect(deleteButton).toBeDisabled();

    resolveDelete();
  });

  it('displays error message when delete mutation fails', async () => {
    vi.mocked(removeReference).mockRejectedValueOnce(new Error('Failed to delete method'));
    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const confirmDeleteButton = await screen.findByRole('button', { name: /^delete$/i });
    await user.click(confirmDeleteButton);

    const errorMessage = await screen.findByRole('alert');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Failed to delete method');
  });

  it('invalidates services queries on archive mutation success', async () => {
    vi.mocked(archiveReference).mockResolvedValueOnce();
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveButton);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
    });
  });

  it('allows canceling the delete action in the confirmation dialog', async () => {
    const user = userEvent.setup();
    renderApplicationMethods({ references: mockReferences });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('covers AlertDialog onOpenChange true branch and action click when confirmId is null', async () => {
    mockAlwaysOpen = true;
    try {
      renderApplicationMethods({ references: mockReferences });
      await screen.findByRole('alertdialog');

      // Trigger onOpenChange(true) -> if (!next) evaluates false
      act(() => {
        capturedOnOpenChange?.(true);
      });

      // capturedActionOnClick has confirmId = null closure -> if (confirmId !== null) evaluates false
      act(() => {
        capturedActionOnClick?.();
      });
    } finally {
      mockAlwaysOpen = false;
    }
  });

  it('covers Dialog onOpenChange and cancel path for editing external method', async () => {
    vi.mocked(updateExternalApplication).mockResolvedValueOnce({} as any);
    const user = userEvent.setup();
    const externalRef: ServiceReference = {
      id: 'ref-external-123',
      relation: 'external_application',
      position: 3,
      label: 'External site',
      url: 'https://example.com/apply',
      targetDocumentId: 'doc-external-789',
      targetVersionId: 'v-external-1',
      targetKind: 'external-application',
      targetTitle: 'External Apply',
      targetVersion: 1,
      targetStatus: 'draft',
      hasSubmissions: false,
      hasStructure: false,
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    renderApplicationMethods({ references: [externalRef] });

    // Verify it renders the external link
    expect(screen.getByText('https://example.com/apply')).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByText('Edit external link')).toBeInTheDocument();

    act(() => {
      capturedDialogOnOpenChange?.(false);
    });

    await user.click(editButton);
    act(() => {
      capturedExternalFormProps.onCancel();
    });

    await user.click(editButton);
    act(() => {
      capturedExternalFormProps.onSubmit({
        label: 'External site',
        url: 'https://example.com/new-apply',
      });
    });

    await waitFor(() => {
      expect(updateExternalApplication).toHaveBeenCalledWith(
        'srv-123',
        'v-456',
        'ref-external-123',
        expect.objectContaining({
          label: 'External site',
          url: 'https://example.com/new-apply',
        }),
      );
    });
  });

  it('triggers onReorder on drag end', () => {
    const onReorder = vi.fn();
    renderApplicationMethods({ references: mockReferences, onReorder });

    // Trigger DragEnd
    capturedOnDragEnd?.({ active: { id: 'ref-basic-123' }, over: { id: 'ref-multi-123' } } as any);

    expect(onReorder).toHaveBeenCalledWith(['ref-multi-123', 'ref-basic-123']);
  });

  it('does not call onReorder when move returns undefined', () => {
    const onReorder = vi.fn();
    vi.mocked(move).mockReturnValueOnce({});
    renderApplicationMethods({ references: mockReferences, onReorder });

    capturedOnDragEnd?.({ active: { id: 'ref-basic-123' }, over: { id: 'ref-multi-123' } } as any);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('covers isPending branch when editing external method is pending', async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(updateExternalApplication).mockReturnValueOnce(promise as any);

    const user = userEvent.setup();
    const externalRef: ServiceReference = {
      id: 'ref-external-123',
      relation: 'external_application',
      position: 3,
      label: 'External site',
      url: 'https://example.com/apply',
      targetDocumentId: 'doc-external-789',
      targetVersionId: 'v-external-1',
      targetKind: 'external-application',
      targetTitle: 'External Apply',
      targetVersion: 1,
      targetStatus: 'draft',
      hasSubmissions: false,
      hasStructure: false,
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    renderApplicationMethods({ references: [externalRef] });

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByText('Edit external link')).toBeInTheDocument();

    act(() => {
      capturedExternalFormProps.onSubmit({
        label: 'External site',
        url: 'https://example.com/apply',
      });
    });

    await waitFor(() => {
      expect(capturedExternalFormProps.submitting).toBe(true);
    });

    act(() => {
      capturedDialogOnOpenChange?.(false);
    });
    expect(screen.getByText('Edit external link')).toBeInTheDocument();

    act(() => {
      capturedExternalFormProps.onCancel();
    });
    expect(screen.getByText('Edit external link')).toBeInTheDocument();

    await act(async () => {
      resolvePromise({});
    });
  });

  it('handles external application reference with null label and url', async () => {
    const user = userEvent.setup();
    const externalRef: ServiceReference = {
      id: 'ref-external-123',
      relation: 'external_application',
      position: 3,
      label: null as any,
      url: null as any,
      targetDocumentId: 'doc-external-789',
      targetVersionId: 'v-external-1',
      targetKind: 'external-application',
      targetTitle: 'External Apply',
      targetVersion: 1,
      targetStatus: 'draft',
      hasSubmissions: false,
      hasStructure: false,
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    renderApplicationMethods({ references: [externalRef] });

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByText('Edit external link')).toBeInTheDocument();

    expect(capturedExternalFormProps.initial).toEqual({
      label: '',
      url: '',
    });
  });
});
