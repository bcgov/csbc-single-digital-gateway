import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewSheet } from '@/components/console/new-sheet';
import { within } from '@testing-library/react';
import { afterEach } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../../../support/render-app';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Link: ({ to, params, children, ...props }: any) => {
      // Mock Link to render as a native anchor tag with populated path
      const href = to.replace('$slug', params?.slug ?? '');
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

describe('NewSheet Component Test Suite', () => {
  describe('NewSheet', () => {
    it('renders disabled trigger when slug is undefined', () => {
      render(<NewSheet slug={undefined} />);

      const triggerBtn = screen.getByRole('button', { name: 'New' });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toBeDisabled();
    });

    it('renders enabled trigger when slug is provided', () => {
      render(<NewSheet slug="riverton" />);

      const triggerBtn = screen.getByRole('button', { name: 'New' });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).not.toBeDisabled();
    });

    it('opens sheet with Service option card linking to services page when clicked', async () => {
      const user = userEvent.setup();
      render(<NewSheet slug="riverton" />);

      const triggerBtn = screen.getByRole('button', { name: 'New' });
      await user.click(triggerBtn);

      // Verify sheet header and details
      expect(await screen.findByRole('heading', { name: 'Create new' })).toBeInTheDocument();
      expect(screen.getByText('What would you like to add to this workspace?')).toBeInTheDocument();

      // Verify Service option card title and description
      expect(screen.getByText('Service')).toBeInTheDocument();
      expect(
        screen.getByText(
          'A service-type document that groups related applications citizens interact with.',
        ),
      ).toBeInTheDocument();

      // Verify the Link targets the correct path
      const serviceLink = screen.getByRole('link', { name: /service/i });
      expect(serviceLink).toBeInTheDocument();
      expect(serviceLink).toHaveAttribute('href', '/app/riverton/services');
    });
  });

  describe('header "New" button', () => {
    async function openSheet() {
      mockAuth(authedUser, { workspaces: [riverton] });
      renderApp('/app/riverton');
      const user = userEvent.setup();
      // Wait for the workspace-scoped console to finish loading before opening the sheet.
      await screen.findByText(/Overview is being set up/i, undefined, { timeout: 32000 });
      await user.click(screen.getByRole('button', { name: 'New' }));
      return {
        user,
        sheet: await screen.findByRole('dialog', { name: /create new/i }, { timeout: 32000 }),
      };
    }

    it('opens a side sheet with the Service option (applications are created within a service)', async () => {
      const { sheet } = await openSheet();
      expect(within(sheet).getByRole('link', { name: /Service/ })).toHaveAttribute(
        'href',
        '/app/riverton/services',
      );
      // The "Application" option was removed — methods are created from the service detail.
      expect(within(sheet).queryByRole('button', { name: /Application/ })).not.toBeInTheDocument();
    });

    it('disables the New button when there is no active workspace', async () => {
      mockAuth(authedUser, { workspaces: [] });
      renderApp('/app');

      await screen.findByRole('dialog', { name: /create workspace/i }, { timeout: 32000 });
      expect(screen.getByRole('button', { name: 'New' })).toBeDisabled();
    });
  });
});
