import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  listSubmissions,
  getSubmission,
  reviewSubmission,
  submissionsQueryOptions,
  submissionQueryOptions,
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

describe('Submissions review API client', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('lists submissions without status filter', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ id: 'sub-1', applicantName: 'John Doe' }] }),
    );

    const res = await listSubmissions('ws-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/submissions?workspaceId=ws-1', {
      credentials: 'include',
    });
    expect(res).toHaveLength(1);
    expect(res[0]?.applicantName).toBe('John Doe');
  });

  it('lists submissions with status filter', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [] }));

    await listSubmissions('ws-1', 'pending');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/submissions?workspaceId=ws-1&status=pending',
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

    await expect(getSubmission('sub-1')).rejects.toThrow('GET /v1/submissions/sub-1 failed: 500');
  });

  it('proposes correct submissionsQueryOptions configuration details', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [] }));

    // Without status
    const optsAll = submissionsQueryOptions('ws-1');
    expect(optsAll.queryKey).toEqual(['submissions', 'ws-1', 'all']);
    const resAll = await (optsAll.queryFn as any)();
    expect(resAll).toEqual([]);

    // With status
    const optsReview = submissionsQueryOptions('ws-1', 'in_review');
    expect(optsReview.queryKey).toEqual(['submissions', 'ws-1', 'in_review']);
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
