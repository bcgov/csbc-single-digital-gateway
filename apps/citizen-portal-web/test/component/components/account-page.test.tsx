import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';
import { InfoCell } from '@/components/account-page';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: {
    sub: 'subject-1',
    display_name: 'Amina Ali',
    given_name: 'Amina',
    family_name: 'Ali',
    email: 'amina@example.com',
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function renderAccount(me: Response | Promise<Response>) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/auth/logout')) return new Response(null, { status: 204 });
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/account'] }),
  });
  await router.load();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web /account page', () => {
  it('shows the signed-in user’s name and email', async () => {
    await renderAccount(jsonResponse(authedUser));
    expect(
      await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument();
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('amina@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });

  it('prompts an anonymous visitor to log in', async () => {
    await renderAccount(new Response(null, { status: 401 }));
    expect(
      await screen.findByText(
        'You need to be signed in to view your account.',
        {},
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
    const links = await screen.findAllByRole('link', { name: /log in/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });

  it('renders a loading skeleton when authorization state is pending', async () => {
    const pendingPromise = new Promise<Response>(() => {});
    await renderAccount(pendingPromise);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Account settings' })).toBeNull();
  });

  it('does not display email field if user email claim is missing', async () => {
    const userNoEmail = {
      id: 'c1',
      roles: ['citizen'],
      claims: {
        sub: 'subject-1',
        display_name: 'Amina Ali',
        given_name: 'Amina',
        family_name: 'Ali',
      },
    };
    await renderAccount(jsonResponse(userNoEmail));
    expect(
      await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument();
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.queryByText('amina@example.com')).toBeNull();
  });

  it('logs out and redirects to homepage when log out button is clicked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/auth/logout')) return new Response(null, { status: 204 });
      if (url.includes('/v1/services')) return jsonResponse({ items: [] });
      if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });

    const user = userEvent.setup();
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/account'] }),
    });
    await router.load();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /account menu/i }));
    const logoutBtn = await screen.findByRole('menuitem', { name: /log out/i });
    await user.click(logoutBtn);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('renders full address, gender, and capitalizeFirst helper correctly', async () => {
    const userWithAddressAndGender = {
      id: 'c1',
      roles: ['citizen'],
      claims: {
        sub: 'subject-1',
        display_name: 'Amina Ali',
        given_name: 'Amina',
        family_name: 'Ali',
        email: 'amina@example.com',
        gender: 'female',
        birthdate: '1990-01-01',
        address: {
          street_address: '123 Main St',
          locality: 'Victoria',
          region: 'BC',
          postal_code: 'V8W 2Y2',
        },
      },
    };
    await renderAccount(jsonResponse(userWithAddressAndGender));
    expect(
      await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify capitalized gender
    expect(screen.getByText('Female')).toBeInTheDocument();

    // Verify address lines
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Victoria, BC V8W 2Y2')).toBeInTheDocument();
  });

  it('handles empty and partial address details correctly', async () => {
    const userWithEmptyAddress = {
      id: 'c1',
      roles: ['citizen'],
      claims: {
        sub: 'subject-1',
        display_name: 'Amina Ali',
        given_name: 'Amina',
        family_name: 'Ali',
        email: 'amina@example.com',
        address: {},
      },
    };
    await renderAccount(jsonResponse(userWithEmptyAddress));
    expect(
      await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify address is empty/omitted
    expect(screen.queryByText('Victoria')).toBeNull();

    // Verify partial address with locality only
    const userWithLocality = {
      id: 'c1',
      roles: ['citizen'],
      claims: {
        sub: 'subject-1',
        display_name: 'Amina Ali',
        given_name: 'Amina',
        family_name: 'Ali',
        email: 'amina@example.com',
        address: {
          locality: 'Vancouver',
        },
      },
    };
    await renderAccount(jsonResponse(userWithLocality));
    expect(await screen.findByText('Vancouver')).toBeInTheDocument();

    // Verify partial address with region/postal only
    const userWithRegionPostal = {
      id: 'c1',
      roles: ['citizen'],
      claims: {
        sub: 'subject-1',
        display_name: 'Amina Ali',
        given_name: 'Amina',
        family_name: 'Ali',
        email: 'amina@example.com',
        address: {
          region: 'BC',
          postal_code: 'V6B 1A1',
        },
      },
    };
    await renderAccount(jsonResponse(userWithRegionPostal));
    expect(await screen.findByText('BC V6B 1A1')).toBeInTheDocument();
  });

  it('renders InfoCell with default className when none is provided', () => {
    const { container } = render(<InfoCell label="Username" value="Amina" />);
    const cellElement = container.firstChild;
    expect(cellElement).toHaveClass('flex', 'flex-col', 'gap-1', 'p-4');
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument();
  });
});
