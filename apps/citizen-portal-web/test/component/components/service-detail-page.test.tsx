import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../support/render-app';
import { createMockBff } from '../../support/create-mock-bff';
import { serviceDetail } from '../../support/fixtures';
import { renderPage } from '../../support/render-page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Service Detail Page Test Suite', () => {
  describe('Service Detail Page', () => {
    it('renders the published service with no version switcher', async () => {
      createMockBff();
      await renderPage({ path: '/services/svc-1' });
      expect(
        await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 }),
      ).toBeInTheDocument();
      expect(screen.getByText('Financial support for residents.')).toBeInTheDocument();
      // The detail screen always shows the published version — no affordance to change versions.
      const versionLinks = screen
        .queryAllByRole('link')
        .filter((link) => link.getAttribute('href')?.includes('/versions/'));
      expect(versionLinks).toHaveLength(0);
    });

    it('renders without description if service has no description', async () => {
      const detailNoDesc = { ...serviceDetail, description: '' };
      createMockBff({ svc: jsonResponse(detailNoDesc) });
      await renderPage({ path: '/services/svc-1' });
      expect(
        await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 32000 }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Financial support for residents.')).not.toBeInTheDocument();
    });

    it('surfaces the application forms in How to apply', async () => {
      createMockBff();
      renderPage({ path: '/services/svc-1' });
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 });
      expect(screen.getByRole('heading', { name: 'How to apply' })).toBeInTheDocument();
      expect(screen.getByText('Your Profile')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Apply online' })).toHaveAttribute(
        'href',
        '/services/svc-1/apply/f1',
      );
    });

    it('renders an external method as a "Visit site" link opening the url in a new tab', async () => {
      createMockBff();
      renderPage({ path: '/services/svc-1' });
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 });
      const visit = screen.getByRole('link', { name: 'Visit site' });
      expect(visit).toHaveAttribute('href', 'https://gov.uk/apply');
      expect(visit).toHaveAttribute('target', '_blank');
      expect(visit).toHaveAttribute('rel', 'noopener noreferrer');
      // The external method does NOT link into the in-portal apply flow.
      expect(visit).not.toHaveAttribute('href', expect.stringContaining('/apply/'));
    });

    it('titles the "Your activity" card by application name, then a Ref/date line', async () => {
      const myApp = {
        id: 'app-1',
        serviceId: 'svc-1',
        serviceVersionId: 'ver-3',
        serviceTitle: 'Service One',
        formTitle: 'Service One application',
        reference: '20250701-0009',
        status: 'draft',
        statusLabel: 'Draft',
        lastUpdated: '2025-07-01T00:00:00.000Z',
      };
      createMockBff({ applications: jsonResponse({ items: [myApp] }) });

      renderPage({ path: '/services/svc-1' });
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 });

      // First line = the application (form) name, linking to the application page.
      const activityLink = await screen.findByRole('link', { name: /Service One application/i });
      expect(activityLink).toHaveAttribute('href', '/applications/app-1');
      // Second line leads with "Ref #" — the service is implicit here, so no name prefixes the meta.
      expect(screen.getByText(/^Ref #20250701-0009 •/)).toBeInTheDocument();
    });

    it('shows a not-available state on 404', async () => {
      createMockBff({ svc: new Response(null, { status: 404 }) });
      await renderPage({ path: '/services/missing' });
      expect(
        await screen.findByRole('heading', { name: /not available/i }, { timeout: 10000 }),
      ).toBeInTheDocument();
    });
  });

  describe('Service Version Page', () => {
    it('renders a historical version with its status', async () => {
      createMockBff();
      await renderPage({ path: '/services/svc-1/versions/ver-1' });
      expect(
        await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 }),
      ).toBeInTheDocument();
      expect(screen.getByText('archived')).toBeInTheDocument();
      expect(screen.getByText(/historical version/i)).toBeInTheDocument();
      expect(screen.getByText('The original copy.')).toBeInTheDocument();
    });

    it('shows a not-available state on 404', async () => {
      createMockBff({ ver: new Response(null, { status: 404 }) });
      await renderPage({ path: '/services/svc-1/versions/missing' });
      expect(
        await screen.findByRole('heading', { name: /not available/i }, { timeout: 10000 }),
      ).toBeInTheDocument();
    });

    it('redirects the current published version to the canonical service page', async () => {
      createMockBff(); // detail.publishedVersionId === 'ver-3'
      const { router } = await renderPage({ path: '/services/svc-1/versions/ver-3' });
      await waitFor(() =>
        expect(router.state.location.pathname.replace(/\/$/, '')).toBe('/services/svc-1'),
      );
      expect(screen.queryByText(/historical version/i)).not.toBeInTheDocument();
    });
  });
});
