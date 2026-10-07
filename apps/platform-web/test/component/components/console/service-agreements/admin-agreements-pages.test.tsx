import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';
import { serviceAgreement, serviceAgreementsDetailResponse } from '../../../../support/fixtures';
import { mockServiceAgreementsBff } from '../../../../support/mock-service-agreements-bff';

// Explicitly import the routes to make sure they are registered in the test runner
import '@/routes/admin';
import '@/routes/admin.service-agreements';
import '@/routes/admin.service-agreements.index';
import '@/routes/admin.service-agreements.new';
import '@/routes/admin.service-agreements.$id';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Admin Agreements Pages Component Test Suite', () => {
  it('AdminAgreementsNew opens the New agreement modal and allows creating one', async () => {
    const fetchMock = mockServiceAgreementsBff(serviceAgreement, {
      testFile: 'admin-agreements-pages.test',
      serviceResponse: serviceAgreementsDetailResponse,
    });
    renderApp('/admin/service-agreements/new');

    const modal = await screen.findByRole(
      'dialog',
      { name: /new service agreement/i },
      { timeout: 32000 },
    );
    expect(modal).toBeInTheDocument();

    const titleInput = within(modal).getByLabelText(/title/i);
    const descInput = within(modal).getByLabelText(/description/i);
    const createBtn = within(modal).getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'New Global TOS');
    await userEvent.type(descInput, 'Description for New Global TOS');
    await userEvent.click(createBtn);

    // Verify it sent a POST to create agreement
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('AdminAgreementDetail renders details of a specific agreement version', async () => {
    mockServiceAgreementsBff(serviceAgreement, {
      testFile: 'admin-agreements-pages.test',
      serviceResponse: serviceAgreementsDetailResponse,
    });
    renderApp('/admin/service-agreements/g1');

    // Wait for the detail content to load (which would display editor details or title)
    expect(
      await screen.findByText('Global Privacy Policy', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Version v1/, {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it('AdminAgreementsList renders list of admin service agreements', async () => {
    mockServiceAgreementsBff(serviceAgreement, {
      testFile: 'admin-agreements-pages.test',
      serviceResponse: serviceAgreementsDetailResponse,
    });
    renderApp('/admin/service-agreements');

    // Verify it renders the agreements list header and items
    expect(
      await screen.findByText('Global Privacy Policy', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });
});
