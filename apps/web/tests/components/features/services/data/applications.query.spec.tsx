const mockGet = jest.fn();

jest.mock("src/api/api.client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { applicationsForServiceQueryOptions } from "src/features/services/data/applications.query";

const validResponse = {
  items: [
    {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      serviceId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      serviceVersionId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      serviceVersionTranslationId: "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      serviceApplicationId: "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
      serviceApplicationType: "workflow",
      userId: "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
      delegateUserId: null,
      metadata: { executionId: "129", submissionIds: [] },
      createdAt: "2026-04-22T12:00:00.000Z",
      updatedAt: "2026-04-22T12:00:00.000Z",
      serviceTitle: "Small Business Grant",
      serviceApplicationTitle: "Apply Online",
    },
  ],
  total: 1,
  page: 1,
  limit: 5,
};

describe("applicationsForServiceQueryOptions", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("Should build a queryKey of ['services', serviceId, 'applications', { page, limit }]", () => {
    const options = applicationsForServiceQueryOptions({
      serviceId: "svc-1",
      page: 1,
      limit: 5,
    });

    expect(options.queryKey).toEqual([
      "services",
      "svc-1",
      "applications",
      { page: 1, limit: 5 },
    ]);
  });

  it("Should call api.get with /v1/services/$serviceId/applications and page/limit params", async () => {
    mockGet.mockResolvedValueOnce({ data: validResponse });

    const options = applicationsForServiceQueryOptions({
      serviceId: "svc-1",
      page: 2,
      limit: 10,
    });
    await options.queryFn!({
      queryKey: options.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockGet.mock.calls[0];
    expect(url).toBe("/v1/services/svc-1/applications");
    expect(config).toEqual({ params: { page: 2, limit: 10 } });
  });

  it("Should parse a valid paginated envelope through ApplicationsListResponseDto and return it", async () => {
    mockGet.mockResolvedValueOnce({ data: validResponse });

    const options = applicationsForServiceQueryOptions({
      serviceId: "svc-1",
      page: 1,
      limit: 5,
    });
    const result = await options.queryFn!({
      queryKey: options.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });

    expect(result).toEqual(validResponse);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].serviceTitle).toBe("Small Business Grant");
    expect(result.items[0].serviceApplicationTitle).toBe("Apply Online");
    expect(result.total).toBe(1);
  });

  it("Should reject with a Zod error when the response body does not match ApplicationsListResponseDto", async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: "not-an-array", total: 0, page: 1, limit: 5 },
    });

    const options = applicationsForServiceQueryOptions({
      serviceId: "svc-1",
      page: 1,
      limit: 5,
    });

    await expect(
      options.queryFn!({
        queryKey: options.queryKey,
        signal: new AbortController().signal,
        meta: undefined,
        client: undefined as never,
      }),
    ).rejects.toThrow();
  });

  it("Should propagate the axios error when the underlying GET fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network failure"));

    const options = applicationsForServiceQueryOptions({
      serviceId: "svc-1",
      page: 1,
      limit: 5,
    });

    await expect(
      options.queryFn!({
        queryKey: options.queryKey,
        signal: new AbortController().signal,
        meta: undefined,
        client: undefined as never,
      }),
    ).rejects.toThrow("Network failure");
  });
});
