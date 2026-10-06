import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, renderApp } from '../../support/render-app';
import { AdminOverview } from '@/components/admin/pages/admin-overview';
import { adminUser } from '../../support/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Admin Index Route', () => {
  it('renders the admin overview set up alert message', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    expect(
      await screen.findByText(
        /Platform administration — the admin overview is being set up/i,
        undefined,
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
  });

  it('renders the layout component directly without crashing for the admin overview page component', () => {
    const { container } = render(<AdminOverview />);
    expect(container).toBeDefined();
  });
});
