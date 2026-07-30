import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VersionActions } from '@/components/admin/document-types/version-actions';
import {
  archiveVersion,
  deleteDraft,
  publishVersion,
  type DocumentTypeVersion,
} from '@/lib/document-types';

// Mock the API library calls.
vi.mock('@/lib/document-types', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/document-types')>();
  return {
    ...original,
    archiveVersion: vi.fn(),
    deleteDraft: vi.fn(),
    publishVersion: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
};

const mockDraftVersion: DocumentTypeVersion = {
  id: 'v-draft-id',
  typeId: 'type-1',
  version: 1,
  status: 'draft',
  definition: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  publishedAt: null,
  archivedAt: null,
};

const mockPublishedVersion: DocumentTypeVersion = {
  id: 'v-pub-id',
  typeId: 'type-1',
  version: 2,
  status: 'published',
  definition: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  publishedAt: '2026-06-01T00:00:00.000Z',
  archivedAt: null,
};

const mockArchivedVersion: DocumentTypeVersion = {
  id: 'v-arc-id',
  typeId: 'type-1',
  version: 3,
  status: 'archived',
  definition: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  publishedAt: '2026-06-01T00:00:00.000Z',
  archivedAt: '2026-06-01T00:00:00.000Z',
};

describe('VersionActions', () => {
  it('renders Publish, Archive, and Delete buttons for a draft version', () => {
    renderWithQueryClient(<VersionActions typeId="type-1" version={mockDraftVersion} />);

    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders only the Archive button for a published version', () => {
    renderWithQueryClient(<VersionActions typeId="type-1" version={mockPublishedVersion} />);

    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('renders no buttons for an archived version', () => {
    renderWithQueryClient(<VersionActions typeId="type-1" version={mockArchivedVersion} />);

    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('calls publishVersion and invalidates query cache when Publish button is clicked', async () => {
    vi.mocked(publishVersion).mockResolvedValue({ ...mockDraftVersion, status: 'published' });
    const { queryClient } = renderWithQueryClient(
      <VersionActions typeId="type-1" version={mockDraftVersion} />,
    );
    const user = userEvent.setup();

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(publishVersion).toHaveBeenCalledWith('type-1', 'v-draft-id');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'document-types'] });
    });
  });

  it('calls archiveVersion and invalidates query cache when Archive button is clicked', async () => {
    vi.mocked(archiveVersion).mockResolvedValue({ ...mockPublishedVersion, status: 'archived' });
    const { queryClient } = renderWithQueryClient(
      <VersionActions typeId="type-1" version={mockPublishedVersion} />,
    );
    const user = userEvent.setup();

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => {
      expect(archiveVersion).toHaveBeenCalledWith('type-1', 'v-pub-id');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'document-types'] });
    });
  });

  it('calls deleteDraft and invalidates query cache when Delete button is clicked', async () => {
    vi.mocked(deleteDraft).mockResolvedValue(undefined);
    const { queryClient } = renderWithQueryClient(
      <VersionActions typeId="type-1" version={mockDraftVersion} />,
    );
    const user = userEvent.setup();

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deleteDraft).toHaveBeenCalledWith('type-1', 'v-draft-id');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'document-types'] });
    });
  });

  it('disables all buttons while a mutation is pending', async () => {
    // Return a promise that does not resolve immediately to keep mutation in pending state
    let resolveMutation: any;
    const pendingPromise = new Promise<any>((resolve) => {
      resolveMutation = resolve;
    });
    vi.mocked(publishVersion).mockReturnValue(pendingPromise);

    renderWithQueryClient(<VersionActions typeId="type-1" version={mockDraftVersion} />);
    const user = userEvent.setup();

    const publishBtn = screen.getByRole('button', { name: 'Publish' });
    const archiveBtn = screen.getByRole('button', { name: 'Archive' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete' });

    // Click publish to trigger pending mutation state
    await user.click(publishBtn);

    // Expect all buttons to be disabled
    expect(publishBtn).toBeDisabled();
    expect(archiveBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();

    // Clean up/resolve the pending promise
    resolveMutation({ ...mockDraftVersion, status: 'published' });
  });
});
