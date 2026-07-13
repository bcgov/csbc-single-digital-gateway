import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hero } from '@/components/landing/hero';
import { LoginCta } from '@/components/landing/login-cta';

/**
 * Regression guard for the deployed-login "Not Found" bug.
 *
 * In production the BFF is co-hosted with the SPA, so `useLoginUrl()` resolves to a SAME-ORIGIN
 * relative path (e.g. `/api/auth/login?returnTo=%2F`). A TanStack `<Link>` intercepts that click
 * and routes it client-side — no such route exists, so the app renders its notFound ("Not Found")
 * and the browser never reaches the BFF. Login affordances must therefore be plain `<a href>`
 * anchors that trigger a FULL-PAGE navigation to the BFF.
 *
 * The other login tests don't catch this: the test/dev BFF origin is absolute
 * (`http://localhost:4000`), which even `<Link>` treats as external and renders as a plain anchor.
 * Here we force the production-shaped relative URL to exercise the real regression.
 */

const RELATIVE_LOGIN_URL = '/api/auth/login?returnTo=%2F';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, useLoginUrl: () => RELATIVE_LOGIN_URL };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function expectFullPageLoginNavigation(link: HTMLElement) {
  // A native anchor: href passes through verbatim (no origin rewriting) ...
  expect(link.tagName).toBe('A');
  expect(link).toHaveAttribute('href', RELATIVE_LOGIN_URL);
  // ... and the click is NOT cancelled — an intercepting router <Link> would preventDefault here,
  // swallowing the navigation. fireEvent.click returns false iff default was prevented.
  expect(fireEvent.click(link)).toBe(true);
}

describe('citizen-portal-web login affordances — full-page navigation to the BFF', () => {
  it('Hero login button navigates the browser (not client-side routing)', () => {
    render(<Hero />);
    expectFullPageLoginNavigation(screen.getByRole('link', { name: /log in/i }));
  });

  it('LoginCta login button navigates the browser (not client-side routing)', () => {
    render(<LoginCta />);
    expectFullPageLoginNavigation(screen.getByRole('link', { name: /log in/i }));
  });
});
