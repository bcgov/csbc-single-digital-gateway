import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: {
    sub: 'subject-1',
    display_name: 'Amina Ali',
    given_name: 'Amina',
    family_name: 'Ali',
    email: 'amina@example.com',
    birthdate: '1990-02-01',
    gender: 'female',
    address: {
      street_address: '20338 - 65 AVENUE',
      locality: 'LANGLEY',
      region: 'BC',
      postal_code: 'V2Y 3J1',
      country: 'CA',
    },
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAccount(me: Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/account'] }),
  });
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
  it('renders the personal-information grid from the signed-in user’s claims', async () => {
    renderAccount(jsonResponse(authedUser));
    expect(
      await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 10000 }),
    ).toBeInTheDocument();

    // Grid cells: labels + values sourced from /auth/me claims.
    expect(screen.getByText('Given Names')).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument();
    expect(screen.getByText('Surname')).toBeInTheDocument();
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('1990-02-01')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    // The claim value `female` is displayed with a capitalized first letter.
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('amina@example.com')).toBeInTheDocument();
    expect(screen.getByText('20338 - 65 AVENUE')).toBeInTheDocument();
    expect(screen.getByText('LANGLEY, BC V2Y 3J1')).toBeInTheDocument();

    // Settings cards link out to the right places.
    expect(screen.getByRole('link', { name: /notification preferences/i })).toHaveAttribute(
      'href',
      '/account/notifications',
    );
    expect(screen.getByRole('link', { name: /service agreements/i })).toHaveAttribute(
      'href',
      '/account/service-agreements',
    );

    // The Log out button was removed from this page.
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('renders an em-dash for claims the IdP did not provide', async () => {
    renderAccount(
      jsonResponse({
        id: 'c2',
        roles: ['citizen'],
        claims: { sub: 'subject-2', given_name: 'Jo', email: 'jo@example.com' },
      }),
    );
    await screen.findByRole('heading', { name: 'Account settings' }, { timeout: 10000 });
    // Date of Birth, Gender, Surname, Address all absent → em-dash placeholders.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('prompts an anonymous visitor to log in', async () => {
    renderAccount(new Response(null, { status: 401 }));
    const link = await screen.findByRole('link', { name: /log in/i }, { timeout: 10000 });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });
});
