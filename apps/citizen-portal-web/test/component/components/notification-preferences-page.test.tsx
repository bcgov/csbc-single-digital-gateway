import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preferencesDirty } from '@/components/notification-preferences-page';
import { renderPage } from '../../support/render-page';
import { createMockBff } from '../../support/create-mock-bff';
import { jsonResponse } from '../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Notification Preferences Page Test Suite', () => {
  describe('notification preferences page', () => {
    it('Should render the seeded toggles and email', async () => {
      createMockBff({
        notificationPreferencesOptions: {
          preferences: {
            userId: 'c1',
            email: 'amina@example.com',
            channels: [
              { channel: 'in_app', enabled: true },
              { channel: 'email', enabled: true },
            ],
          },
        },
      });
      await renderPage();
      expect(
        await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 }),
      ).toBeInTheDocument();
      const inApp = await screen.findByRole('switch', { name: 'In-app notifications' });
      expect(inApp).toBeChecked();
      // Base UI Switch exposes disabled state via aria-disabled, not the native attribute.
      expect(inApp).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('switch', { name: 'Email notifications' })).toBeChecked();
      expect(screen.getByLabelText('Contact email')).toHaveValue('amina@example.com');
    });

    it('Should saves toggled channels and the email through the BFF', async () => {
      const user = userEvent.setup();
      const puts: string[] = [];
      createMockBff({ puts });
      await renderPage();
      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
      await user.click(await screen.findByRole('switch', { name: 'Email notifications' }));
      await user.click(screen.getByRole('button', { name: 'Save preferences' }));
      await waitFor(() => {
        expect(puts).toHaveLength(1);
      });
      const body = JSON.parse(puts[0]!) as {
        email: string;
        channels: { channel: string; enabled: boolean }[];
      };
      expect(body.email).toBe('amina@example.com');
      expect(body.channels).toContainEqual({ channel: 'email', enabled: true });
      // in_app is mandatory (feature 128) — never sent on the write path.
      expect(body.channels.some((c) => c.channel === 'in_app')).toBe(false);
    });

    it('Should handle auth pending state', async () => {
      createMockBff({ authOptions: { authPending: true } });
      await renderPage();
      // Wait a brief moment and verify that skeletons or page shells are rendered but not the content
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(
        screen.queryByRole('heading', { name: 'Notification settings' }),
      ).not.toBeInTheDocument();
    });

    it('Should handle unauthenticated user', async () => {
      createMockBff({ authOptions: { me: jsonResponse(null) } });
      await renderPage();
      expect(
        await screen.findByText(
          'You need to be signed in to manage notifications.',
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: 'Log in' })[0]).toBeInTheDocument();
    });

    it('Should handle preferences loading state', async () => {
      createMockBff({ notificationPreferencesOptions: { delayPreferencesMs: 500 } });
      await renderPage();
      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
      // Preferences are still loading, so the form should not be rendered yet.
      expect(screen.queryByLabelText('Contact email')).not.toBeInTheDocument();
    });

    it('Should handle preferences query failure', async () => {
      createMockBff({ notificationPreferencesOptions: { errorOnPreferences: true } });
      await renderPage();
      expect(
        await screen.findByText(
          'Notification settings are temporarily unavailable.',
          {},
          { timeout: 10000 },
        ),
      ).toBeInTheDocument();
    });

    it('Should handle saving preferences failure', async () => {
      const user = userEvent.setup();
      createMockBff({ notificationPreferencesOptions: { errorOnSave: true } });
      await renderPage();
      const saveButton = await screen.findByRole(
        'button',
        { name: 'Save preferences' },
        { timeout: 10000 },
      );
      await user.click(saveButton);
      expect(
        await screen.findByText('Saving failed — please try again.', {}, { timeout: 10000 }),
      ).toBeInTheDocument();
    });

    it('Should show saving status while saving is in progress', async () => {
      const user = userEvent.setup();
      createMockBff({ notificationPreferencesOptions: { delaySaveMs: 200 } });
      await renderPage();
      const saveButton = await screen.findByRole(
        'button',
        { name: 'Save preferences' },
        { timeout: 10000 },
      );
      await user.click(saveButton);
      expect(await screen.findByText('Saving…', {}, { timeout: 10000 })).toBeInTheDocument();
      // After it completes, the text goes back to Save preferences
      expect(
        await screen.findByText('Save preferences', {}, { timeout: 10000 }),
      ).toBeInTheDocument();
    });

    it('Should saves trimmed email and handles empty state validation', async () => {
      const user = userEvent.setup();
      const puts: string[] = [];
      createMockBff({
        puts,
        notificationPreferencesOptions: {
          preferences: {
            userId: 'c1',
            email: null,
            channels: [
              { channel: 'in_app', enabled: true },
              { channel: 'email', enabled: true },
            ],
          },
        },
      });
      await renderPage();

      const emailInput = await screen.findByLabelText('Contact email', {}, { timeout: 10000 });
      expect(emailInput).toHaveValue('');

      const saveButton = screen.getByRole('button', { name: 'Save preferences' });

      // The save button is disabled initially because email notifications are enabled but email is empty.
      expect(saveButton).toBeDisabled();

      // Type a spaces-only or blank email - should still be disabled.
      await user.type(emailInput, '   ');
      expect(saveButton).toBeDisabled();

      // Type a real email with extra surrounding spaces to verify trimming
      await user.clear(emailInput);
      await user.type(emailInput, '  john@example.com  ');
      expect(saveButton).toBeEnabled();

      await user.click(saveButton);
      await waitFor(() => {
        expect(puts).toHaveLength(1);
      });
      const body = JSON.parse(puts[0]!) as { email: string | null };
      expect(body.email).toBe('john@example.com');
    });
  });

  describe('preferencesDirty helper', () => {
    it('Should detects changes correctly', () => {
      // 1. Email difference (line 35)
      expect(
        preferencesDirty(
          { email: 'a@example.com', channels: [] },
          { email: 'b@example.com', channels: [] },
        ),
      ).toBe(true);

      // 2. Channels length difference (line 38)
      expect(
        preferencesDirty(
          { email: 'a@example.com', channels: [{ channel: 'email', enabled: true }] },
          { email: 'a@example.com', channels: [] },
        ),
      ).toBe(true);

      // 3. Channels missing/undefined match (line 42 match === undefined)
      expect(
        preferencesDirty(
          { email: 'a@example.com', channels: [{ channel: 'email', enabled: true }] },
          { email: 'a@example.com', channels: [{ channel: 'in_app', enabled: true }] },
        ),
      ).toBe(true);

      // 4. Channel enabled difference (line 42 match.enabled !== c.enabled)
      expect(
        preferencesDirty(
          { email: 'a@example.com', channels: [{ channel: 'email', enabled: true }] },
          { email: 'a@example.com', channels: [{ channel: 'email', enabled: false }] },
        ),
      ).toBe(true);

      // 5. No difference (returns false)
      expect(
        preferencesDirty(
          { email: 'a@example.com', channels: [{ channel: 'email', enabled: true }] },
          { email: 'a@example.com', channels: [{ channel: 'email', enabled: true }] },
        ),
      ).toBe(false);
    });
  });

  describe('notification preferences page - blocker and prompt', () => {
    it('Should blocks navigation when form is dirty and confirms or cancels', async () => {
      const user = userEvent.setup();
      createMockBff();
      const { router } = await renderPage();

      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
      await screen.findByRole('button', { name: 'Save preferences' }, { timeout: 10000 });

      // Spy on window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm');

      // 0. Form is clean -> navigate should work without prompt
      await router.navigate({ to: '/' });
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(router.state.location.pathname).toBe('/');

      // Go back to settings page
      await router.navigate({ to: '/account/notifications' });
      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
      await screen.findByRole('button', { name: 'Save preferences' }, { timeout: 10000 });

      // Make the form dirty by turning on Email notifications
      await user.click(await screen.findByRole('switch', { name: 'Email notifications' }));

      // 1. User clicks Cancel on confirm dialog -> should block navigation
      confirmSpy.mockReturnValueOnce(false);
      router.navigate({ to: '/' });
      expect(confirmSpy).toHaveBeenCalledWith(
        'You have unsaved changes. Leave this page without saving?',
      );
      expect(router.state.location.pathname).toBe('/account/notifications');

      // 2. User clicks OK on confirm dialog -> should allow navigation
      confirmSpy.mockReturnValueOnce(true);
      await router.navigate({ to: '/' });
      expect(confirmSpy).toHaveBeenCalledWith(
        'You have unsaved changes. Leave this page without saving?',
      );
      expect(router.state.location.pathname).toBe('/');
    });

    it('Should saves preferences with disabled email channel and null email', async () => {
      const user = userEvent.setup();
      const puts: string[] = [];
      createMockBff({
        puts,
        notificationPreferencesOptions: {
          preferences: {
            userId: 'c1',
            email: null,
            channels: [
              { channel: 'in_app', enabled: true },
              { channel: 'email', enabled: false },
            ],
          },
        },
      });
      await renderPage();

      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });

      // Click save preferences immediately
      await user.click(await screen.findByRole('button', { name: 'Save preferences' }));

      await waitFor(() => {
        expect(puts).toHaveLength(1);
      });

      const body = JSON.parse(puts[0]!) as { email: string | null; channels: any[] };
      expect(body.email).toBeNull();
    });
  });
});
