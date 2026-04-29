const mockGet = jest.fn();

jest.mock("src/api/api.client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { applicationActionsQueryOptions } from "src/features/services/data/application-actions.query";

const APPLICATION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const validAction = {
  id: "be485cd1-c77f-473c-9ca1-70d2ce13be15",
  actionType: "showform",
  payload: {
    formId: "f409389b-bf5f-4677-95d5-02fdb05c2b5d",
    formAPIKey: "18673b12-8f06-42d8-a694-db2d9ba8fc15",
  },
  callbackUrl:
    "https://dev-chwf-sdg.apps.gold.devops.gov.bc.ca/webhook-waiting/197?signature=abc",
  callbackMethod: "POST",
  callbackPayloadSpec: { formSubmissionId: "ABC-EFG-123-456-789" },
  actorId: "xzhs52istyggbt6q2jinalncwmirlhg6",
  actorType: "user",
  workflowInstanceId: "197",
  workflowId: "kImTywz4mGvrcCgJ",
  projectId: "sBm11Jr62dNJwm01",
  status: "pending",
  priority: "normal",
  dueDate: null,
  checkIn: null,
  metadata: null,
  createdAt: "2026-04-28T15:57:31.803Z",
  updatedAt: "2026-04-28T15:57:31.803Z",
};

const validResponse = { items: [validAction], nextCursor: null };

describe("applicationActionsQueryOptions", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  const runQueryFn = async (applicationId = APPLICATION_ID) => {
    const options = applicationActionsQueryOptions(applicationId);
    return options.queryFn!({
      queryKey: options.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });
  };

  it("builds a queryKey of ['applications', applicationId, 'actions']", () => {
    const options = applicationActionsQueryOptions(APPLICATION_ID);
    expect(options.queryKey).toEqual([
      "applications",
      APPLICATION_ID,
      "actions",
    ]);
  });

  it("calls api.get with /v1/me/applications/$applicationId/actions and no params", async () => {
    mockGet.mockResolvedValueOnce({ data: validResponse });

    await runQueryFn();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      `/v1/me/applications/${APPLICATION_ID}/actions`,
    );
  });

  it("parses the { items, nextCursor } envelope through WorkflowActionsResponseDto and returns it", async () => {
    mockGet.mockResolvedValueOnce({ data: validResponse });

    const result = await runQueryFn();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(validAction.id);
    expect(result.nextCursor).toBeNull();
  });

  it("rejects with a Zod error when items is missing", async () => {
    mockGet.mockResolvedValueOnce({ data: { nextCursor: null } });

    await expect(runQueryFn()).rejects.toThrow();
  });

  it("rejects with a Zod error when an action has an unknown status enum value", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        items: [{ ...validAction, status: "something-new" }],
        nextCursor: null,
      },
    });

    await expect(runQueryFn()).rejects.toThrow();
  });

  it("propagates the axios error when the underlying GET fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network failure"));

    await expect(runQueryFn()).rejects.toThrow("Network failure");
  });

  it("sets staleTime: 0 (the polling hook drives refetches)", () => {
    const options = applicationActionsQueryOptions(APPLICATION_ID);
    expect(options.staleTime).toBe(0);
  });

  it("sets retry: false (errors surface to the hook; backoff handles retries)", () => {
    const options = applicationActionsQueryOptions(APPLICATION_ID);
    expect(options.retry).toBe(false);
  });
});
