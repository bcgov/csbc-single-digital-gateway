import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../support/render-app';
import { createMockSubmissionsBff } from '../../support/create-mock-submissions-bff';
import { mockBasicSubmission } from '../../support/fixtures';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App Slug Submissions ID Detail Route', () => {
  it('renders the submission detail page correctly', async () => {
    createMockSubmissionsBff(mockBasicSubmission);
    renderApp('/app/riverton/submissions/sub-123');

    // Wait for the submission detail header to render
    expect(await screen.findByText('Test User', undefined, { timeout: 32000 })).toBeInTheDocument();

    // Verify submission details and metadata
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText(/Parking Permits · Application Form/i)).toBeInTheDocument();
    expect(screen.getByText(/REF-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/i)).toBeInTheDocument();

    // Verify answers section header
    expect(screen.getByText('Answers')).toBeInTheDocument();

    // Verify review decision buttons are rendered
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    // Verify notes textarea is present
    expect(
      screen.getByPlaceholderText('Add a note for the applicant (optional)…'),
    ).toBeInTheDocument();
  });
});
