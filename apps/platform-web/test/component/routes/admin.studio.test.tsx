import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { FormStudioPage } from '@/components/admin/pages/form-studio-page';
import { ADMIN_NAV, adminSectionFor } from '@/lib/admin-nav';

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };

describe('Admin Studio Route', () => {
  it('lists a Studio item in ADMIN_NAV pointing at /admin/studio', () => {
    const studioItem = ADMIN_NAV.find((item) => item.key === 'studio');
    expect(studioItem).toBeDefined();
    expect(studioItem).toMatchObject({ key: 'studio', label: 'Studio', to: '/admin/studio' });
  });

  it('resolves /admin/studio to the Studio nav item via adminSectionFor', () => {
    // adminSectionFor matches segments[1] against item.key, so the key must equal the segment.
    const studioItem = ADMIN_NAV.find((item) => item.key === 'studio');
    expect(adminSectionFor('/admin/studio')).toBe(studioItem);
    expect(adminSectionFor('/admin/studio/')).toBe(studioItem);
  });

  it('renders a Studio link in the admin sidebar', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    const link = await screen.findByRole('link', { name: /studio/i }, { timeout: 32000 });
    expect(link).toHaveAttribute('href', '/admin/studio');
  });

  it('renders FormStudio when an admin navigates to /admin/studio', async () => {
    mockAuth(adminUser);
    renderApp('/admin/studio');

    expect(
      await screen.findByText('Hello, FormStudio!', undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  // Doc 181 rule 18 — a visible edge between the studio and the admin page around it.
  it('wraps FormStudio in a bordered, full-height frame', () => {
    const { container } = render(<FormStudioPage />);
    const frame = container.querySelector('[data-slot="form-studio-frame"]');
    expect(frame).toHaveClass('h-full', 'border', 'bg-background');
    expect(frame?.firstElementChild).toHaveAttribute('data-slot', 'form-studio');
    expect(container.firstElementChild).toBe(frame);
  });

  it('renders the page component directly without crashing', () => {
    const { container } = render(<FormStudioPage />);
    expect(container.querySelector('[data-slot="form-studio"]')).toBeInTheDocument();
  });
});
