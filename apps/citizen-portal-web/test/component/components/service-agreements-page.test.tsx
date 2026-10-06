import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupByMonth } from '@/components/service-agreements-page';
import { renderPage, AGREEMENTS } from '../../support/render-page';
import { createMockBff } from '../../support/create-mock-bff';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Service Agreements Page Test Suite', () => {
  describe('citizen-portal-web /account/service-agreements timeline', () => {
    it('renders an empty state when the citizen has approved nothing', async () => {
      createMockBff();
      await renderPage({ list: [] });
      expect(
        await screen.findByRole('heading', { name: 'Service Agreements' }, { timeout: 10000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/no service agreements yet/i, {}, { timeout: 10000 }),
      ).toBeInTheDocument();
    });

    it('renders approvals grouped into month sections with link cards to the detail', async () => {
      createMockBff({ serviceAgreements: AGREEMENTS });
      await renderPage({ list: AGREEMENTS });
      // Card titles for each approval.
      expect(
        await screen.findByText('Privacy Agreement', {}, { timeout: 10000 }),
      ).toBeInTheDocument();
      expect(screen.getByText('Terms of Use')).toBeInTheDocument();
      expect(screen.getByText('Data Sharing')).toBeInTheDocument();
      // Two month sections (Jan 2027 + Dec 2026) → at least two h2 headings.
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2);
      // Each card links to its detail route.
      expect(screen.getByRole('link', { name: /Privacy Agreement/i })).toHaveAttribute(
        'href',
        '/account/service-agreements/a1',
      );
    });

    it('prompts an anonymous visitor to log in on service agreements page', async () => {
      createMockBff({ me: new Response(null, { status: 401 }) });
      await renderPage({ path: '/account/service-agreements' });
      expect(
        await screen.findByText(
          /You need to be signed in to view your service agreements/i,
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
      const links = screen.getAllByRole('link', { name: /log in/i });
      expect(links[0]).toHaveAttribute('href', expect.stringContaining('/auth/login'));
    });

    it('shows an error message when the service agreements query fails', async () => {
      createMockBff({ serviceAgreementsOptions: { errorOnAgreements: true } });
      await renderPage({ errorOnAgreements: true });

      expect(
        await screen.findByText(
          /service agreements are temporarily unavailable/i,
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
    });
  });

  describe('citizen-portal-web /account/service-agreements/:id detail', () => {
    it('shows the agreement name as the heading, the decision status, and read-only radios', async () => {
      createMockBff({
        serviceAgreement: {
          id: 'a1',
          agreementDocumentId: 'd1',
          title: 'Privacy Agreement',
          description: 'Our privacy terms',
          content: null,
          decision: 'approve',
          approveLabel: 'I accept',
          rejectLabel: 'I decline',
          consentedAt: '2027-01-15T12:00:00.000Z',
        },
      });
      await renderPage({
        path: '/account/service-agreements/a1',
      });
      // The agreement name is the page heading (h1).
      expect(
        await screen.findByRole(
          'heading',
          { name: 'Privacy Agreement', level: 1 },
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
      // The decision + date is the subtitle status line.
      expect(screen.getByText(/approved on/i)).toBeInTheDocument();
      expect(screen.getByText('Our privacy terms')).toBeInTheDocument();
      // Read-only radios show the authored labels with the recorded decision selected.
      expect(screen.getByRole('radio', { name: 'I accept' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'I decline' })).not.toBeChecked();
      // Breadcrumb roots at the account settings page.
      expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
        'href',
        '/account',
      );
    });

    it('shows a not-found message when the agreement 404s', async () => {
      createMockBff({ serviceAgreementsOptions: { agreementDetailNotFound: true } });
      await renderPage({
        path: '/account/service-agreements/missing',
      });
      expect(
        await screen.findByText(/could not be found/i, {}, { timeout: 10000 }),
      ).toBeInTheDocument();
    });

    it('prompts an anonymous visitor to log in on detail page', async () => {
      createMockBff({ me: new Response(null, { status: 401 }) });
      await renderPage({
        path: '/account/service-agreements/a1',
      });
      expect(
        await screen.findByText(
          /You need to be signed in to view this service agreement/i,
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
    });

    it('shows an error message when the agreement query fails', async () => {
      createMockBff({ serviceAgreement: new Response(null, { status: 500 }) });
      await renderPage({
        path: '/account/service-agreements/a1',
      });
      expect(
        await screen.findByText(
          /service agreement is temporarily unavailable/i,
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
    });

    it('shows detail of a rejected agreement with content and no description', async () => {
      const mockLexicalContent = {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Acceptable terms content',
                  type: 'text',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      };

      createMockBff({
        serviceAgreement: {
          id: 'a2',
          agreementDocumentId: 'd2',
          title: 'Terms of Use',
          description: null,
          content: mockLexicalContent,
          decision: 'reject',
          approveLabel: 'I accept',
          rejectLabel: 'I decline',
          consentedAt: '2027-01-10T12:00:00.000Z',
        },
      });
      await renderPage({
        path: '/account/service-agreements/a2',
      });
      expect(
        await screen.findByRole('heading', { name: 'Terms of Use', level: 1 }, { timeout: 10000 }),
      ).toBeInTheDocument();

      expect(screen.getByText(/rejected on/i)).toBeInTheDocument();
      expect(
        await screen.findByText('Acceptable terms content', {}, { timeout: 10000 }),
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'I accept' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'I decline' })).toBeChecked();
    });
  });

  describe('groupByMonth', () => {
    it('groups a descending list into months then days', () => {
      const months = groupByMonth(AGREEMENTS);
      expect(months).toHaveLength(2);
      // Jan 2027: two distinct days (a1, a2); Dec 2026: one day (a3).
      expect(months[0]!.days).toHaveLength(2);
      expect(months[1]!.days).toHaveLength(1);
      expect(months[0]!.days[0]!.items[0]!.id).toBe('a1');
    });

    it('groups multiple items on the same day correctly', () => {
      const items = [
        {
          id: 'a1',
          agreementDocumentId: 'd1',
          title: 'Privacy Agreement 1',
          consentedAt: '2027-01-15T12:00:00.000Z',
        },
        {
          id: 'a2',
          agreementDocumentId: 'd2',
          title: 'Privacy Agreement 2',
          consentedAt: '2027-01-15T15:00:00.000Z',
        },
      ];
      const months = groupByMonth(items);
      expect(months).toHaveLength(1);
      expect(months[0]!.days).toHaveLength(1);
      expect(months[0]!.days[0]!.items).toHaveLength(2);
      expect(months[0]!.days[0]!.items[0]!.id).toBe('a1');
      expect(months[0]!.days[0]!.items[1]!.id).toBe('a2');
    });

    it('returns an empty array for no items', () => {
      expect(groupByMonth([])).toEqual([]);
    });
  });
});
