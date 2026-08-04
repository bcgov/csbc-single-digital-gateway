import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubmissionDetail } from '@/components/console/submissions/submission-detail';
import { reviewSubmission } from '@/lib/submissions';
import type { SubmissionDetail as SubmissionDetailData } from '@/lib/submissions';

const mockParams = { slug: 'riverton', id: 'sub-123' };

vi.mock('@tanstack/react-router', () => ({
  useParams: () => mockParams,
  Link: ({ to, params, children, ...props }: any) => {
    let href = to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: vi.fn(({ data, readonly }: any) => (
    <div data-testid="mock-json-forms">
      Mocked JSONForms: {JSON.stringify(data)} (readonly: {String(readonly)})
    </div>
  )),
}));

vi.mock('@repo/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

let mockSubmissionData: SubmissionDetailData | null = null;
let mockSubmissionError: Error | null = null;
let mockSubmissionLoading = false;

vi.mock('@/lib/submissions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/submissions')>();
  return {
    ...original,
    reviewSubmission: vi.fn(),
    submissionQueryOptions: (id: string) => ({
      queryKey: ['submissions', 'detail', id],
      queryFn: () => {
        if (mockSubmissionLoading) {
          return new Promise(() => {}); // stay pending
        }
        if (mockSubmissionError) {
          return Promise.reject(mockSubmissionError);
        }
        return Promise.resolve(mockSubmissionData);
      },
      retry: false,
    }),
  };
});

const mockBasicSubmission: SubmissionDetailData = {
  id: 'sub-123',
  serviceId: 'srv-123',
  serviceTitle: 'Parking Permits',
  formId: 'form-123',
  formTitle: 'Application Form',
  applicantName: 'Test User',
  applicantEmail: 'test@example.com',
  status: 'pending',
  statusLabel: 'Pending Review',
  reference: 'REF-0001',
  submittedAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
  kind: 'basic-form',
  structure: {
    schema: { type: 'object', properties: { parkingType: { type: 'string' } } },
    uischema: { type: 'VerticalLayout', elements: [] },
  },
  data: { parkingType: 'Residential' },
  reviews: [],
};

const mockMultiStageSubmission: SubmissionDetailData = {
  id: 'sub-456',
  serviceId: 'srv-123',
  serviceTitle: 'Business Permit',
  formId: 'form-456',
  formTitle: 'Multi Form',
  applicantName: 'Jane Doe',
  applicantEmail: null,
  status: 'approved',
  statusLabel: 'Approved',
  reference: 'REF-0002',
  submittedAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
  kind: 'multi-stage-form',
  structure: {
    stages: [
      {
        pages: [
          {
            id: 'page-1',
            name: 'Business Details',
            schema: { type: 'object', properties: { bizName: { type: 'string' } } },
            uischema: { type: 'VerticalLayout', elements: [] },
          },
          {
            id: 'page-2',
            name: 'Contact Details',
            schema: { type: 'object', properties: { phone: { type: 'string' } } },
            uischema: { type: 'VerticalLayout', elements: [] },
          },
        ],
      },
    ],
  },
  data: { bizName: 'Acme Corp', phone: '123-4567' },
  reviews: [
    {
      id: 'rev-1',
      decision: 'approve',
      reason: 'Looks great!',
      reviewerName: 'Admin Staff',
      createdAt: '2026-07-15T02:00:00Z',
    },
  ],
};

function renderSubmissionDetail(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SubmissionDetail />
    </QueryClientProvider>,
  );
}

describe('SubmissionDetail Component Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSubmissionData = null;
    mockSubmissionError = null;
    mockSubmissionLoading = false;
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders loading skeletons when query is pending', () => {
    mockSubmissionLoading = true;
    renderSubmissionDetail(queryClient);

    expect(screen.getAllByTestId('skeleton')).toHaveLength(2);
  });

  it('renders error state when query fails', async () => {
    mockSubmissionError = new Error('Failed to fetch');
    renderSubmissionDetail(queryClient);

    expect(await screen.findByText('This submission could not be loaded.')).toBeInTheDocument();

    const backBtn = screen.getByRole('link', { name: 'Back to submissions' });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn.getAttribute('href')).toBe('/app/riverton/submissions');
  });

  it('renders loaded state for basic form submission with reviewable status', async () => {
    mockSubmissionData = mockBasicSubmission;
    renderSubmissionDetail(queryClient);

    // Header info
    expect(await screen.findByRole('heading', { name: 'Test User' })).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Parking Permits · Application Form')).toBeInTheDocument();
    expect(screen.getByText(/REF-0001 · test@example\.com/)).toBeInTheDocument();

    // Answers section
    expect(screen.getByRole('heading', { name: 'Answers' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-json-forms')).toBeInTheDocument();
    expect(
      screen.getByText(/Mocked JSONForms: {"parkingType":"Residential"} \(readonly: true\)/),
    ).toBeInTheDocument();

    // Review Panel for reviewable status ('pending')
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add a note for the applicant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    // History section should not render since there are no reviews
    expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument();
  });

  it('renders loaded state for multi-stage form submission with actioned status and history', async () => {
    mockSubmissionData = mockMultiStageSubmission;
    renderSubmissionDetail(queryClient);

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getAllByText('Approved')).toHaveLength(2);
    expect(screen.getByText('Business Permit · Multi Form')).toBeInTheDocument();
    expect(screen.getByText(/REF-0002/)).toBeInTheDocument();

    // Multi-stage answers should show titles of pages
    expect(screen.getByRole('heading', { name: 'Business Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact Details' })).toBeInTheDocument();
    expect(screen.getAllByTestId('mock-json-forms')).toHaveLength(2);

    // Actioned review status notice
    expect(screen.getByText(/has been actioned/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Add a note for the applicant/i)).not.toBeInTheDocument();

    // History section
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('approve')).toBeInTheDocument();
    expect(screen.getByText('Looks great!')).toBeInTheDocument();
    expect(screen.getByText(/Admin Staff/)).toBeInTheDocument();
  });

  it('performs review submission successfully and invalidates queries', async () => {
    const user = userEvent.setup();
    mockSubmissionData = mockBasicSubmission;

    vi.mocked(reviewSubmission).mockResolvedValue({
      ...mockBasicSubmission,
      status: 'approved',
      statusLabel: 'Approved',
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderSubmissionDetail(queryClient);

    const noteInput = await screen.findByPlaceholderText(/Add a note for the applicant/i);
    await user.type(noteInput, 'Valid submission.');

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    await user.click(approveBtn);

    await waitFor(() => {
      expect(reviewSubmission).toHaveBeenCalledTimes(1);
    });

    expect(reviewSubmission).toHaveBeenCalledWith('sub-123', {
      decision: 'approve',
      reason: 'Valid submission.',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submissions'] });
    expect(noteInput).toHaveValue(''); // Resets textarea after success
  });

  it('shows error message if review submission fails', async () => {
    const user = userEvent.setup();
    mockSubmissionData = mockBasicSubmission;

    vi.mocked(reviewSubmission).mockRejectedValue(new Error('Network error'));

    renderSubmissionDetail(queryClient);

    const approveBtn = await screen.findByRole('button', { name: 'Approve' });
    await user.click(approveBtn);

    expect(
      await screen.findByText('Could not record the review — please try again.'),
    ).toBeInTheDocument();
  });

  it('handles null submittedAt, empty page names, and reviews without reason in multi-stage form', async () => {
    const mockCustomSubmission: SubmissionDetailData = {
      id: 'sub-custom',
      serviceId: 'srv-123',
      serviceTitle: 'Custom Service',
      formId: 'form-custom',
      formTitle: 'Custom Form',
      applicantName: 'Charlie',
      applicantEmail: null,
      status: 'approved',
      statusLabel: 'Approved',
      reference: 'REF-0003',
      submittedAt: null as any,
      updatedAt: '2026-07-15T00:00:00Z',
      kind: 'multi-stage-form',
      structure: {
        stages: [
          {
            pages: [
              {
                id: 'page-1',
              },
            ],
          },
        ],
      },
      data: {},
      reviews: [
        {
          id: 'rev-2',
          decision: 'approve',
          reason: '',
          reviewerName: 'Reviewer Guy',
          createdAt: '2026-07-15T02:00:00Z',
        },
      ],
    };

    mockSubmissionData = mockCustomSubmission;
    renderSubmissionDetail(queryClient);

    expect(await screen.findByRole('heading', { name: 'Charlie' })).toBeInTheDocument();
    const headerText = screen.getByText(/REF-0003/).textContent;
    expect(headerText).not.toContain('Submitted');
    expect(headerText).not.toContain('@');

    expect(screen.queryByRole('heading', { name: /Business Details/ })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('approve')).toBeInTheDocument();
    expect(screen.queryByText('Looks great!')).not.toBeInTheDocument();
  });

  it('handles basic form submission with empty/missing schema', async () => {
    const mockEmptyBasicSubmission: SubmissionDetailData = {
      id: 'sub-empty',
      serviceId: 'srv-123',
      serviceTitle: 'Empty Service',
      formId: 'form-empty',
      formTitle: 'Empty Form',
      applicantName: 'Empty User',
      applicantEmail: 'empty@example.com',
      status: 'pending',
      statusLabel: 'Pending Review',
      reference: 'REF-0004',
      submittedAt: '2026-07-15T00:00:00Z',
      updatedAt: '2026-07-15T00:00:00Z',
      kind: 'basic-form',
      structure: {},
      data: {},
      reviews: [],
    };

    mockSubmissionData = mockEmptyBasicSubmission;
    renderSubmissionDetail(queryClient);

    expect(await screen.findByRole('heading', { name: 'Empty User' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-json-forms')).toBeInTheDocument();
  });

  it('covers multi-stage form structure fallbacks', async () => {
    const mockFallbackSubmission: SubmissionDetailData = {
      id: 'sub-fallback',
      serviceId: 'srv-123',
      serviceTitle: 'Custom Service',
      formId: 'form-custom',
      formTitle: 'Custom Form',
      applicantName: 'Charlie',
      applicantEmail: null,
      status: 'approved',
      statusLabel: 'Approved',
      reference: 'REF-0004',
      submittedAt: null as any,
      updatedAt: '2026-07-15T00:00:00Z',
      kind: 'multi-stage-form',
      structure: {},
      data: {},
      reviews: [],
    };

    mockSubmissionData = mockFallbackSubmission;
    renderSubmissionDetail(queryClient);

    expect(await screen.findByText('REF-0004')).toBeInTheDocument();
  });

  it('covers stage pages and page id fallback', async () => {
    const mockPageFallbackSubmission: SubmissionDetailData = {
      id: 'sub-page-fallback',
      serviceId: 'srv-123',
      serviceTitle: 'Custom Service',
      formId: 'form-custom',
      formTitle: 'Custom Form',
      applicantName: 'Charlie',
      applicantEmail: null,
      status: 'approved',
      statusLabel: 'Approved',
      reference: 'REF-0005',
      submittedAt: null as any,
      updatedAt: '2026-07-15T00:00:00Z',
      kind: 'multi-stage-form',
      structure: {
        stages: [
          {},
          {
            pages: [{}],
          },
        ],
      },
      data: {},
      reviews: [],
    };

    mockSubmissionData = mockPageFallbackSubmission;
    renderSubmissionDetail(queryClient);

    expect(await screen.findByText('REF-0005')).toBeInTheDocument();
  });
});
