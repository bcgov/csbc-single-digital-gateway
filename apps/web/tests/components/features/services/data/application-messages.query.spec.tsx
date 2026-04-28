const mockGet = jest.fn();

jest.mock("src/api/api.client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { applicationMessagesQueryOptions } from "src/features/services/data/application-messages.query";

const APPLICATION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const validMessage = {
  id: "7b4844e1-916e-45cb-aaae-145bd2847f57",
  title: "Thanks for starting your SDG Integration Demo",
  body: "Welcome User 2 we will email you as your application progresses.",
  actorId: "xzhs52istyggbt6q2jinalncwmirlhg6",
  actorType: "user",
  workflowInstanceId: "197",
  workflowId: "kImTywz4mGvrcCgJ",
  projectId: "sBm11Jr62dNJwm01",
  status: "active",
  metadata: null,
  createdAt: "2026-04-28T15:57:31.690Z",
  updatedAt: "2026-04-28T15:57:31.690Z",
};

const validResponse = { items: [validMessage] };

describe("applicationMessagesQueryOptions", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  const runQueryFn = async (applicationId = APPLICATION_ID) => {
    const options = applicationMessagesQueryOptions(applicationId);
    return options.queryFn!({
      queryKey: options.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
      client: undefined as never,
    });
  };

  it("builds a queryKey of ['applications', applicationId, 'messages']", () => {
    const options = applicationMessagesQueryOptions(APPLICATION_ID);
    expect(options.queryKey).toEqual([
      "applications",
      APPLICATION_ID,
      "messages",
    ]);
  });

  it("calls api.get with /v1/me/applications/$applicationId/messages and no params", async () => {
    mockGet.mockResolvedValueOnce({ data: validResponse });

    await runQueryFn();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      `/v1/me/applications/${APPLICATION_ID}/messages`,
    );
  });

  it("parses the { items } envelope through WorkflowMessagesResponseDto and returns it", async () => {
    mockGet.mockResolvedValueOnce({ data: validResponse });

    const result = await runQueryFn();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe(validMessage.title);
    expect(result.items[0].status).toBe("active");
  });

  it("rejects with a Zod error when items is missing", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    await expect(runQueryFn()).rejects.toThrow();
  });

  it("rejects with a Zod error when a message has an unknown status enum value", async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [{ ...validMessage, status: "unknown" }] },
    });

    await expect(runQueryFn()).rejects.toThrow();
  });

  it("propagates the axios error when the underlying GET fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network failure"));

    await expect(runQueryFn()).rejects.toThrow("Network failure");
  });

  it("sets staleTime: 0 (the polling hook drives refetches)", () => {
    const options = applicationMessagesQueryOptions(APPLICATION_ID);
    expect(options.staleTime).toBe(0);
  });

  it("sets retry: false", () => {
    const options = applicationMessagesQueryOptions(APPLICATION_ID);
    expect(options.retry).toBe(false);
  });
});
