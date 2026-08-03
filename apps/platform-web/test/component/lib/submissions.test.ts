import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  listSubmissions,
  getSubmission,
  reviewSubmission,
  submissionsQueryOptions,
  submissionQueryOptions,
  type SubmissionListParams,
} from '@/lib/submissions';

// Mock BFF origin
vi.mock('@/lib/bff', () => ({
  BFF_ORIGIN: 'http://bff-test',
}));

const mockResponse = (status: number, data: any, okState = true) => {
  return {
    ok: okState,
    status,
    json: () => Promise.resolve(data),
  } as Response;
};

describe('Submissions Unit Test Suite', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('lists submissions without status filter', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ id: 'sub-1', applicantName: 'John Doe' }], total: 1 }),
    );

    const params: SubmissionListParams = {
      q: '',
      sort: 'submitted',
      order: 'desc',
      limit: 10,
      offset: 0,
    };
    const res = await listSubmissions('ws-1', params);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/submissions?workspaceId=ws-1&sort=submitted&order=desc&limit=10&offset=0',
      {
        credentials: 'include',
      },
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.applicantName).toBe('John Doe');
  });

  it('lists submissions with status filter', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [], total: 0 }));

    const params: SubmissionListParams = {
      q: '',
      sort: 'submitted',
      order: 'desc',
      limit: 10,
      offset: 0,
      status: 'pending',
    };
    await listSubmissions('ws-1', params);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/submissions?workspaceId=ws-1&sort=submitted&order=desc&limit=10&offset=0&status=pending',
      {
        credentials: 'include',
      },
    );
  });

  it('gets a single submission details by id', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'sub-1', data: {} }));

    const res = await getSubmission('sub-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/submissions/sub-1', {
      credentials: 'include',
    });
    expect(res.id).toBe('sub-1');
  });

  it('reviews submission with a POST request', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'sub-1', status: 'approved' }));

    const reviewInput = { decision: 'approve' as const, reason: 'Approved application' };
    const res = await reviewSubmission('sub-1', reviewInput);
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/submissions/sub-1/review', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(reviewInput),
    });
    expect(res.status).toBe('approved');
  });

  it('throws custom status error message when request fails', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, null, false));

    await expect(getSubmission('sub-1').catch((e: any) => e.message)).resolves.toContain(
      'GET /v1/submissions/sub-1 failed: 500',
    );
  });

  it('proposes correct submissionsQueryOptions configuration details', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [], total: 0 }));

    // Without status
    const paramsAll: SubmissionListParams = {
      q: '',
      sort: 'submitted',
      order: 'desc',
      limit: 10,
      offset: 0,
    };
    const optsAll = submissionsQueryOptions('ws-1', paramsAll);
    expect(optsAll.queryKey).toEqual(['submissions', 'ws-1', paramsAll]);
    const resAll = await (optsAll.queryFn as any)();
    expect(resAll).toEqual({ items: [], total: 0 });

    // With status
    const paramsReview: SubmissionListParams = {
      q: '',
      sort: 'submitted',
      order: 'desc',
      limit: 10,
      offset: 0,
      status: 'in_review',
    };
    const optsReview = submissionsQueryOptions('ws-1', paramsReview);
    expect(optsReview.queryKey).toEqual(['submissions', 'ws-1', paramsReview]);
  });

  it('proposes correct submissionQueryOptions details', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'sub-1' }));

    const opts = submissionQueryOptions('sub-1');
    expect(opts.queryKey).toEqual(['submissions', 'detail', 'sub-1']);
    expect(opts.retry).toBe(false);

    const res = await (opts.queryFn as any)();
    expect(res.id).toBe('sub-1');
  });
});
