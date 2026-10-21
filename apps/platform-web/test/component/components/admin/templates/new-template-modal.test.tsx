import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewTemplateModal } from '@/components/admin/templates/new-template-modal';
import { createTemplate } from '@/lib/templates';

// Doc 227 — New template from /admin/templates.

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));

vi.mock('@/lib/templates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/templates')>()),
  createTemplate: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <NewTemplateModal open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
  return { invalidate };
}

describe('NewTemplateModal (doc 227)', () => {
  it('creates a template of the chosen type and title, then opens its detail', async () => {
    vi.mocked(createTemplate).mockResolvedValue({
      template: {
        id: 'tpl-9',
        workspaceId: null,
        type: 'services.service-agreement',
        createdAt: '',
        updatedAt: '',
      },
      versions: [],
    });
    const { invalidate } = renderModal();

    // Every type is offered, by label.
    const type = screen.getByLabelText('Type');
    expect(
      Array.from((type as HTMLSelectElement).options).map((option) => option.textContent),
    ).toEqual(['Service', 'Application method', 'Service agreement']);

    await userEvent.selectOptions(type, 'services.service-agreement');
    await userEvent.type(screen.getByLabelText('Title'), '  Terms of use  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create template' }));

    await waitFor(() =>
      expect(createTemplate).toHaveBeenCalledWith({
        type: 'services.service-agreement',
        title: 'Terms of use',
      }),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/templates/$id',
        params: { id: 'tpl-9' },
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'templates'] });
  });

  it('disables Create until a title is entered', async () => {
    renderModal();

    const create = screen.getByRole('button', { name: 'Create template' });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Title'), '   ');
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Title'), 'Health');
    expect(create).toBeEnabled();
  });

  it('shows the API error when creation fails', async () => {
    vi.mocked(createTemplate).mockRejectedValue(new Error('title must not be blank'));
    renderModal();

    await userEvent.type(screen.getByLabelText('Title'), 'Health');
    await userEvent.click(screen.getByRole('button', { name: 'Create template' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('title must not be blank');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
