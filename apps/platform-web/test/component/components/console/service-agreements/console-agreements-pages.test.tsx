import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth, renderApp } from '../../../../support/render-app';
import { ConsoleAgreementsList } from '@/components/console/service-agreements/console-agreements-pages';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseParams = vi.fn(() => ({ slug: 'riverton', id: 'a1' }));
const mockUseSearch = vi.fn(() => ({}));
const mockUseNavigate = vi.fn(() => vi.fn());
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useSearch: () => mockUseSearch(),
    useNavigate: () => mockUseNavigate(),
  };
});

// Explicitly import routes to register in the router
import '@/routes/app';
import '@/routes/app.$slug';
import '@/routes/app.$slug.service-agreements';
import '@/routes/app.$slug.service-agreements.index';
import '@/routes/app.$slug.service-agreements.new';
import '@/routes/app.$slug.service-agreements.$id';
import { adminWorkspace, ISO, serviceAgreementsDetailResponse } from '../../../../support/fixtures';

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: vi.fn(({ data, readonly, onChange }: any) => (
    <div data-testid="mock-json-forms">
      <label htmlFor="title-input">Title</label>
      <input
        id="title-input"
        type="text"
        value={data?.title ?? ''}
        disabled={readonly}
        onChange={(e) => {
          onChange({ data: { ...data, title: e.target.value } });
        }}
      />
    </div>
  )),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const mockAgreement = {
  id: 'g1',
  workspaceId: 'w1',
  title: 'Global Privacy Policy',
  kind: 'service-agreement',
  createdAt: ISO,
  status: 'published',
  isGlobal: false,
};

function mockConsoleAgreementsPagesBff() {
  const base = mockAuth(authedUser, { workspaces: [adminWorkspace] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    // Default agreements for workspace
    if (url.includes('/default-agreements')) {
      return jsonResponse({ items: [] });
    }

    // List of agreements for workspace
    if (url.includes('/v1/service-agreements')) {
      if (method === 'POST') {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        return jsonResponse({
          agreement: {
            id: 'a2',
            title: body.data?.title || 'Untitled',
            workspaceId: 'w1',
            createdAt: ISO,
          },
          version: { id: 'v2', version: 1, status: 'draft', data: body.data, createdAt: ISO },
        });
      }

      if (url.includes('/v1/service-agreements/a1') || url.includes('/v1/service-agreements/a2')) {
        return jsonResponse({
          ...serviceAgreementsDetailResponse,
          agreement: { ...serviceAgreementsDetailResponse.agreement, workspaceId: 'w1' },
        });
      }

      return jsonResponse({ items: [mockAgreement] });
    }

    return (base as any)(input, init);
  });
  globalThis.fetch = fetchMock as any;
  return fetchMock;
}

describe('Console Agreements  Component Test Suite', () => {
  it('renders ConsoleAgreementsList (agreements list + workspace defaults panel)', async () => {
    mockConsoleAgreementsPagesBff();
    renderApp('/app/riverton/service-agreements');

    // 1. Verify workspace agreements list renders
    expect(
      await screen.findByText('Global Privacy Policy', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('renders ConsoleAgreementsNew (Agreements list + New agreement modal)', async () => {
    const fetchMock = mockConsoleAgreementsPagesBff();
    renderApp('/app/riverton/service-agreements/new');

    // 1. Verify view loads (agreements list renders behind the modal)
    expect(
      await screen.findByText('Global Privacy Policy', {}, { timeout: 10000 }),
    ).toBeInTheDocument();

    // 2. Verify modal dialog is open
    const modal = await screen.findByRole('dialog', { name: /new service agreement/i });
    expect(modal).toBeInTheDocument();

    const titleInput = within(modal).getByLabelText(/title/i);
    const descInput = within(modal).getByLabelText(/description/i);
    const createBtn = within(modal).getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'New Custom TOS');
    await userEvent.type(descInput, 'Description');
    await userEvent.click(createBtn);

    // Verify POST create endpoint was called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('renders ConsoleAgreementDetail page', async () => {
    mockConsoleAgreementsPagesBff();
    renderApp('/app/riverton/service-agreements/g1');

    // Wait for the auth/me query to load and editable elements to render
    expect(
      await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 }),
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Global Privacy Policy' })).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Global Privacy Policy');
  });

  it('covers useWorkspaceScope loading state (undefined workspace)', () => {
    mockUseParams.mockReturnValue({ slug: 'riverton', id: 'a1' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ConsoleAgreementsList />
      </QueryClientProvider>,
    );

    // It should render agreements list in empty/loading state
    expect(screen.getByRole('button', { name: /new agreement/i })).toBeDisabled();
    expect(
      screen.getByText('No service agreements yet — create one with the New button.'),
    ).toBeInTheDocument();
  });
});
