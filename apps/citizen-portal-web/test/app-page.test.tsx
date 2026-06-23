import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppPage } from '@/components/app-page';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', preferred_username: 'citizen1' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web /app page', () => {
  it('greets the authenticated user resolved from GET /auth/me', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(authedUser)) as unknown as typeof fetch;

    render(<AppPage />);

    expect(await screen.findByRole('heading', { name: 'Hello, citizen1.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('shows a login prompt when GET /auth/me returns 401', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(null, { status: 401 }),
    ) as unknown as typeof fetch;

    render(<AppPage />);

    const link = await screen.findByRole('link', { name: /log in/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('posts to /auth/logout with credentials when Log out is clicked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/auth/me')) return jsonResponse(authedUser);
      return new Response(null, { status: 204 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });

    render(<AppPage />);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      ),
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
  });
});
