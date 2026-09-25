import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../support/render-app';
import { createMockBff } from '../../support/create-mock-bff';
import { authedUser } from '../../support/fixtures';
import { renderPage } from '../../support/render-page';
import { createMockAssign } from '../../support/create-mock-assign';

const userNotFound = new Response(null, { status: 401 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Landing Page Test Suite', () => {
  describe('citizen-portal-web home — signed out', () => {
    it('leads with the hero headline and marketing sections', async () => {
      createMockBff({ me: userNotFound });
      await renderPage({ path: '/' });
      // First render in this file cold-compiles the route tree's heavy deps (JsonForms/Lexical);
      // give the first query a generous timeout so a cold cache doesn't flake it.
      expect(
        await screen.findByRole(
          'heading',
          { name: 'Access government services online' },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Available services' })).toBeInTheDocument();
      expect(screen.getByText('Log in to get started')).toBeInTheDocument();
    });

    it('offers login links that point at the BFF /auth/login endpoint', async () => {
      createMockBff({ me: userNotFound });
      await renderPage({ path: '/' });
      await screen.findByRole('heading', { name: 'Access government services online' });
      const links = screen.getAllByRole('link', { name: /log in/i });
      expect(links.some((link) => link.getAttribute('href')?.includes('/auth/login'))).toBe(true);
    });

    it('renders services from the catalog and links Services in the nav', async () => {
      createMockBff({ me: userNotFound });
      await renderPage({ path: '/' });
      expect(
        await screen.findByRole('link', { name: /Income and Disability Assistance/i }),
      ).toBeInTheDocument();
      const nav = screen.getByRole('navigation', { name: 'Primary' });
      expect(within(nav).getByRole('link', { name: 'Services' })).toHaveAttribute(
        'href',
        '/services',
      );
    });

    it('shows each service card with its description and a catalog link', async () => {
      createMockBff({ me: userNotFound });
      renderPage({ path: '/' });
      const card = await screen.findByRole('link', { name: /Income and Disability Assistance/i });
      // The card navigates straight to the service detail page.
      expect(card).toHaveAttribute('href', '/services/s1');
      // The service description is rendered alongside the title (stacked in the card)...
      expect(screen.getByText('Financial support.')).toBeInTheDocument();
      // ...but sits OUTSIDE the link, so only the title is the underlined link surface.
      expect(card).not.toHaveTextContent('Financial support.');
    });

    it('does not show "Browse all services" when fewer than 3 services are available', async () => {
      createMockBff({ me: userNotFound });
      renderPage({ path: '/' });
      await screen.findByRole('link', { name: /Income and Disability Assistance/i });
      expect(screen.queryByRole('link', { name: /browse all services/i })).toBeNull();
    });

    it('shows a "Browse all services" link to the catalog when the panel is full (3 services)', async () => {
      const threeServices = [
        { id: 's1', title: 'Income and Disability Assistance', description: 'Financial support.' },
        { id: 's2', title: 'Birth Registration', description: 'Register the birth of a child.' },
        { id: 's3', title: 'Marriage Licence', description: 'Apply for a marriage licence.' },
      ];
      createMockBff({ me: userNotFound, services: threeServices });
      renderPage({ path: '/' });
      const browseAll = await screen.findByRole('link', { name: /browse all services/i });
      expect(browseAll).toHaveAttribute('href', '/services');
    });
  });

  describe('citizen-portal-web home — signed in', () => {
    it('greets the citizen and tracks their applications', async () => {
      createMockBff({ me: jsonResponse(authedUser) });
      await renderPage({ path: '/' });
      expect(await screen.findByRole('heading', { name: 'Hi, Amina' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();
      // The application row's status pill + subheading (application name • Ref # • last updated).
      expect(await screen.findByText('Review')).toBeInTheDocument();
      expect(
        screen.getByText(/Birth Registration application • Ref #20250615-0003/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Access government services online' }),
      ).toBeNull();
    });

    it('shows Available services as plain service cards even for services already applied to', async () => {
      // The citizen has an application for s2, yet the Available services card must stay identical to
      // the anonymous card — a service link to the detail page, not an application/status card.
      createMockBff({ me: jsonResponse(authedUser) });
      renderPage({ path: '/' });
      await screen.findByRole('heading', { name: 'Hi, Amina' });
      // Both the tracked application row and the services panel now title by service name, so scope to
      // the service-detail link: the Available services card must link to /services/s2, not an
      // /applications/:id status card.
      const serviceLinks = (await screen.findAllByRole('link', { name: 'Birth Registration' })).map(
        (el) => el.getAttribute('href'),
      );
      expect(serviceLinks).toContain('/services/s2');
    });

    it('shows the empty applications state when there are none', async () => {
      createMockBff({ me: jsonResponse(authedUser), applications: jsonResponse([]) });
      await renderPage({ path: '/' });
      await screen.findByRole('heading', { name: 'Hi, Amina' });
      expect(await screen.findByText(/no applications to track/i)).toBeInTheDocument();
    });

    it('logs out from the account menu', async () => {
      const fetchMock = createMockBff({ me: jsonResponse(authedUser) });
      const assign = createMockAssign();
      const user = userEvent.setup();
      await renderPage({ path: '/' });

      await user.click(await screen.findByRole('button', { name: /account menu/i }));
      await user.click(await screen.findByRole('menuitem', { name: /log out/i }));

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/auth/logout'),
          expect.objectContaining({ method: 'POST', credentials: 'include' }),
        ),
      );
      await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    });
  });

  describe('citizen-portal-web mobile menu', () => {
    it('opens a menu whose top bar carries the brand lockup and an X close control', async () => {
      createMockBff({ me: userNotFound });
      const user = userEvent.setup();
      await renderPage({ path: '/' });

      await screen.findByRole('heading', { name: 'Access government services online' });
      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const dialog = await screen.findByRole('dialog', { name: 'Menu' });
      // Top bar mirrors the header: the brand homepage lockup is present inside the menu.
      expect(
        within(dialog).getByRole('link', { name: /Single Digital Gateway homepage/i }),
      ).toBeInTheDocument();
      // The hamburger is swapped for an X close control (no "Menu" title heading text shown).
      expect(within(dialog).getByRole('button', { name: /close menu/i })).toBeInTheDocument();
      // Nav links are listed in the menu body.
      expect(within(dialog).getByRole('link', { name: 'Services' })).toBeInTheDocument();
    });

    it('closes the menu when the X control is clicked', async () => {
      createMockBff({ me: userNotFound });
      const user = userEvent.setup();
      await renderPage({ path: '/' });

      await screen.findByRole('heading', { name: 'Access government services online' });
      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const dialog = await screen.findByRole('dialog', { name: 'Menu' });
      await user.click(within(dialog).getByRole('button', { name: /close menu/i }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull());
    });
  });
});
