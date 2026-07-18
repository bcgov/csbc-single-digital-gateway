import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };

describe('Admin Index Route', () => {
  it('renders the admin overview set up alert message', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    expect(
      await screen.findByText(/Platform administration — the admin overview is being set up/i),
    ).toBeInTheDocument();
  });
});
