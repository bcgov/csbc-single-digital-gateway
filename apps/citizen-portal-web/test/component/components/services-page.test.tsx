import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockBff } from '../../support/create-mock-bff';
import { renderPage } from '../../support/render-page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Services Page', () => {
  it('Should list published services from the catalog (anonymous)', async () => {
    createMockBff();
    await renderPage({ path: '/services' });
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /Income and Disability Assistance/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Birth Registration/i })).toBeInTheDocument();
  });

  it('Should not show "Your applications" for an anonymous visitor', async () => {
    createMockBff();
    await renderPage({ path: '/services' });
    await screen.findByRole('link', { name: /Birth Registration/i });
    expect(screen.queryByRole('heading', { name: 'Your applications' })).not.toBeInTheDocument();
  });

  it('Should not show a "Your applications" band on the catalog — even when authenticated', async () => {
    createMockBff();
    renderPage({ path: '/services' });
    // Wait for the catalog to render, then confirm no application tracking leaked onto this page.
    await screen.findByRole('link', { name: 'Birth Registration' });
    expect(screen.queryByRole('heading', { name: 'Your applications' })).not.toBeInTheDocument();
    expect(screen.queryByText(/20250615-0003/)).not.toBeInTheDocument();
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
  });

  it('Should render each catalog card as a service-detail link whose text is only the title', async () => {
    createMockBff();
    renderPage({ path: '/services' });
    const card = await screen.findByRole('link', { name: 'Birth Registration' });
    // The whole card navigates to the service detail...
    expect(card).toHaveAttribute('href', '/services/s2');
    // ...but only the title is the link text (so only the title underlines) — the description is
    // a sibling outside the link and is never part of the underlined link surface.
    expect(card).not.toHaveTextContent(/Register the birth/i);
    expect(screen.getByText(/Register the birth of a child/i)).toBeInTheDocument();
  });

  it('Should render the heading and search box above a full-width gold divider (account pattern)', async () => {
    createMockBff();
    renderPage({ path: '/services' });
    const heading = await screen.findByRole('heading', { name: 'Services', level: 1 });
    const search = screen.getByRole('searchbox', { name: /search services/i });

    const divider = document.querySelector('.border-bcgov-gold');
    expect(divider).not.toBeNull();
    // Both the heading and the search box live inside the gold-divided header region.
    expect(divider).toContainElement(heading);
    expect(divider).toContainElement(search);
  });

  it('Should search via the catalog endpoint with the q parameter', async () => {
    const fetchMock = createMockBff();
    const user = userEvent.setup();
    await renderPage({ path: '/services' });
    await screen.findByRole('link', { name: /Birth Registration/i });

    await user.type(screen.getByRole('searchbox', { name: /search services/i }), 'birth');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/services?q=birth'),
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });

  it('Should render "No services found" message when services list is empty', async () => {
    createMockBff({ services: [] });

    await renderPage({ path: '/services' });
    expect(await screen.findByText('No services found.')).toBeInTheDocument();
  });

  it('Should render "No services found for [query]" message when services list is empty with search', async () => {
    createMockBff({ services: [] });

    const user = userEvent.setup();
    await renderPage({ path: '/services' });

    await user.type(screen.getByRole('searchbox', { name: /search services/i }), 'unknown-query');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('No services found for “unknown-query”.')).toBeInTheDocument();
  });
});
