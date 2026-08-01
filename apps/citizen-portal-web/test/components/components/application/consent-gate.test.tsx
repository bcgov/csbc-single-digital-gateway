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

/** A required agreement already approved on its current version — should be hidden by the gate. */
const approvedRequired: ServiceAgreementConsent = {
  agreementVersionId: 'av-done',
  agreementDocumentId: 'ad-done',
  data: {
    title: 'Privacy Policy',
    content: null,
    isOptional: false,
    approveLabel: 'I accept',
    rejectLabel: 'I decline',
  },
  decision: 'approve',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderGate(
  agreements: ServiceAgreementConsent[],
  onContinue = vi.fn(),
  fetchMock = vi.fn(async () => jsonResponse({ agreementVersionId: 'x', decision: 'approve' })),
) {
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

  it('presents only agreements still needing a decision, and records only those on Continue', async () => {
    const user = userEvent.setup();
    // A mix: one already approved on its current version + one still undecided.
    const { fetchMock, onContinue } = renderGate([approvedRequired, required]);

    // The already-approved (unchanged) agreement is hidden; only the pending one is presented.
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();

    // Decide the pending agreement and continue.
    await user.click(screen.getByRole('radio', { name: 'I accept the terms' }));
    const continueBtn = screen.getByRole('button', { name: 'Continue to application' });
    await waitFor(() => expect(continueBtn).toBeEnabled());
    await user.click(continueBtn);
    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce());

    // Exactly ONE consent POST — the pending agreement. The already-approved one is not re-recorded
    // (which is what produced duplicate rows in the /account/service-agreements history).
    const calls = fetchMock.mock.calls as unknown as Array<
      [RequestInfo | URL, RequestInit | undefined]
    >;
    const posts = calls.filter(
      ([url, init]) => String(url).includes('/v1/me/agreement-consents') && init?.method === 'POST',
    );
    expect(posts).toHaveLength(1);
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

  it('handles submission errors and clears error on selection change', async () => {
    const user = userEvent.setup();
    const errorFetch = vi.fn(async () => jsonResponse(null, 500));
    renderGate([required], vi.fn(), errorFetch);

    // Approve the required agreement to enable the button
    await user.click(screen.getByRole('radio', { name: 'I accept the terms' }));
    const continueBtn = screen.getByRole('button', { name: 'Continue to application' });
    await waitFor(() => expect(continueBtn).toBeEnabled());

    // Submit and verify failure message
    await user.click(continueBtn);
    expect(
      await screen.findByText(
        'Could not save your response — please try again.',
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();

    // Change response to decline and verify error message goes away
    await user.click(screen.getByRole('radio', { name: 'I decline' }));
    expect(
      screen.queryByText('Could not save your response — please try again.'),
    ).not.toBeInTheDocument();
  });

  it('renders default titles/labels, optional content/description, and handles multiple agreements text', async () => {
    const defaultLabelsAgreement: ServiceAgreementConsent = {
      agreementVersionId: 'av-def',
      agreementDocumentId: 'ad-def',
      data: {
        isOptional: false,
      },
      decision: null,
    };

    const optAgreementWithContent: ServiceAgreementConsent = {
      agreementVersionId: 'av-opt-content',
      agreementDocumentId: 'ad-opt-content',
      data: {
        title: 'Optional with content',
        description: 'Optional agreement description',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Rich text content here',
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
        },
        isOptional: true,
      },
      decision: null,
    };

    // Render both to check "agreements" plural header description
    renderGate([defaultLabelsAgreement, optAgreementWithContent]);

    expect(screen.getByText(/respond to the following agreements/i)).toBeInTheDocument();

    // Default labels
    expect(screen.getByText('Service agreement')).toBeInTheDocument();
    expect(screen.getAllByText('I approve')[0]).toBeInTheDocument();
    expect(screen.getAllByText('I do not approve')[0]).toBeInTheDocument();

    // Content and description render when present
    expect(screen.getByText('Optional agreement description')).toBeInTheDocument();
    expect(screen.getByText('Rich text content here')).toBeInTheDocument();
  });

  it('seeds local decisions from server decisions', async () => {
    const preApproved: ServiceAgreementConsent = {
      ...required,
      agreementVersionId: 'av-pre-app',
      decision: 'approve',
    };
    renderGate([preApproved]);
    const radioApprove = screen.getByRole('radio', { name: 'I accept the terms' });
    expect(radioApprove).toBeChecked();
  });
});
