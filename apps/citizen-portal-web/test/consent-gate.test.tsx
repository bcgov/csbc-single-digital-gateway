import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsentGate, consentPending } from '@/components/application/consent-gate';
import type { ServiceAgreementConsent } from '@/lib/applications';

const required: ServiceAgreementConsent = {
  agreementVersionId: 'av-req',
  agreementDocumentId: 'ad-req',
  data: {
    title: 'Terms of Service',
    description: 'Please read carefully.',
    content: null,
    isOptional: false,
    approveLabel: 'I accept the terms',
    rejectLabel: 'I decline',
  },
  decision: null,
};

const optional: ServiceAgreementConsent = {
  agreementVersionId: 'av-opt',
  agreementDocumentId: 'ad-opt',
  data: { title: 'Marketing emails', content: null, isOptional: true },
  decision: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderGate(agreements: ServiceAgreementConsent[], onContinue = vi.fn()) {
  const fetchMock = vi.fn(async () =>
    jsonResponse({ agreementVersionId: 'x', decision: 'approve' }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ConsentGate agreements={agreements} serviceId="svc-1" onContinue={onContinue} />
    </QueryClientProvider>,
  );
  return { fetchMock, onContinue };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('consentPending', () => {
  it('is true when undecided, true when a required agreement is rejected, false once satisfied', () => {
    expect(consentPending([required])).toBe(true);
    expect(consentPending([{ ...required, decision: 'reject' }])).toBe(true);
    expect(consentPending([{ ...required, decision: 'approve' }])).toBe(false);
    // Optional accepts either decision (but must be decided).
    expect(consentPending([optional])).toBe(true);
    expect(consentPending([{ ...optional, decision: 'reject' }])).toBe(false);
  });
});

describe('ConsentGate', () => {
  it('does not POST on radio change; records only when Continue is pressed', async () => {
    const user = userEvent.setup();
    const { fetchMock, onContinue } = renderGate([required]);

    const continueBtn = screen.getByRole('button', { name: 'Continue to application' });
    expect(continueBtn).toBeDisabled();

    // Rejecting a required agreement updates the UI but does NOT submit; Continue stays blocked.
    await user.click(screen.getByRole('radio', { name: 'I decline' }));
    expect(screen.getByText(/must approve this agreement/i)).toBeInTheDocument();
    expect(continueBtn).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/agreement-consents'),
      expect.objectContaining({ method: 'POST' }),
    );

    // Approving unblocks Continue — still no POST yet.
    await user.click(screen.getByRole('radio', { name: 'I accept the terms' }));
    await waitFor(() => expect(continueBtn).toBeEnabled());
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/agreement-consents'),
      expect.objectContaining({ method: 'POST' }),
    );

    // Pressing Continue records the decision, THEN advances.
    await user.click(continueBtn);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/me/agreement-consents'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce());
  });

  it('lets an optional agreement be rejected and still continue', async () => {
    const user = userEvent.setup();
    const { onContinue } = renderGate([optional]);

    await user.click(screen.getByRole('radio', { name: 'I do not approve' })); // default optional reject label
    const continueBtn = screen.getByRole('button', { name: 'Continue to application' });
    await waitFor(() => expect(continueBtn).toBeEnabled());
    await user.click(continueBtn);
    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce());
  });
});
