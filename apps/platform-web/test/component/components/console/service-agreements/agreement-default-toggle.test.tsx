import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgreementDefaultToggle } from '@/components/console/service-agreements/agreement-default-toggle';
import { defaultAgreement } from '../../../../support/fixtures';
import { mockWorkspacesDefaultAgreementsBff } from '../../../../support/mock-workspaces-default-agreements-bff';

vi.mock('@repo/ui/switch', () => ({
  Switch: ({ onCheckedChange, checked, ...props }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={(e: any) => {
        const forceFalse = e.currentTarget.getAttribute('data-force-false') === 'true';
        onCheckedChange(forceFalse ? false : !checked);
      }}
      {...props}
    >
      Toggle
    </button>
  ),
}));

function renderToggle(published = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AgreementDefaultToggle
        slug="riverton"
        workspaceId="w1"
        agreementDocumentId="a1"
        published={published}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('agreement default toggle', () => {
  it('is unchecked for a published non-default agreement and POSTs an add when switched on', async () => {
    const fetchMock = mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      defaults: [],
    });

    renderToggle(true);
    const toggle = await screen.findByRole('switch', { name: 'Workspace default' });
    expect(toggle).not.toBeChecked();

    const user = userEvent.setup();
    await user.click(toggle);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, init]) =>
            String(u).includes('/v1/workspaces/w1/default-agreements') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('is checked when already a default and DELETEs the row when switched off', async () => {
    const fetchMock = mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      defaults: [defaultAgreement],
    });

    renderToggle(true);
    const toggle = await screen.findByRole('switch', { name: 'Workspace default' });
    await waitFor(() => expect(toggle).toBeChecked());

    const user = userEvent.setup();
    await user.click(toggle);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, init]) =>
            String(u).includes('/v1/workspaces/w1/default-agreements/d1') &&
            (init?.method ?? 'GET').toUpperCase() === 'DELETE',
        ),
      ).toBe(true);
    });
  });

  it('shows the description as a tooltip on hover instead of inline text', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, { defaults: [] });
    renderToggle(true);

    const label = await screen.findByText('Workspace default');
    // Not shown until hovered.
    expect(screen.queryByText('Applies to every service in this workspace')).toBeNull();

    const user = userEvent.setup();
    await user.hover(label);
    expect(
      await screen.findByText('Applies to every service in this workspace'),
    ).toBeInTheDocument();
  });

  it('renders nothing for a non-admin member', async () => {
    const fetchMock = mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'member',
      defaults: [],
    });
    renderToggle(true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('renders nothing when the agreement is not published', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, { defaults: [] });
    renderToggle(false);
    // Give the queries a chance to resolve; the switch must never appear.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('covers the next = false and current = undefined branch by forcing false switch toggle', async () => {
    const user = userEvent.setup();
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, { defaults: [] });
    renderToggle(true);

    const toggle = await screen.findByRole('switch', { name: 'Workspace default' });
    toggle.setAttribute('data-force-false', 'true');
    await user.click(toggle);

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('renders mutation error alert when the toggle request fails', async () => {
    const user = userEvent.setup();
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      defaults: [],
      failedApi: true,
    });

    renderToggle(true);

    const toggle = await screen.findByRole('switch', { name: 'Workspace default' });
    await user.click(toggle);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server failed to save default agreement');
  });
});
