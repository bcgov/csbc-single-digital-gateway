const mockPost = jest.fn();

jest.mock("src/api/api.client", () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { submitApplication } from "src/features/services/data/applications.mutation";

const validRow = {
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
};

describe("submitApplication", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  describe("request shape", () => {
    it("Should POST to /v1/services/$serviceId/versions/$versionId/apply/$applicationId using the axios api client", async () => {
      mockPost.mockResolvedValueOnce({ data: validRow });

      await submitApplication({
        serviceId: "svc-1",
        versionId: "ver-1",
        applicationId: "app-1",
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      const [url] = mockPost.mock.calls[0];
      expect(url).toBe("/v1/services/svc-1/versions/ver-1/apply/app-1");
    });

    it("Should pass locale as a query string param on the request", async () => {
      mockPost.mockResolvedValueOnce({ data: validRow });

      await submitApplication({
        serviceId: "svc-1",
        versionId: "ver-1",
        applicationId: "app-1",
        locale: "fr",
      });

      const [, , config] = mockPost.mock.calls[0];
      expect(config).toEqual({ params: { locale: "fr" } });
    });

    it("Should default the locale query param to 'en' when not provided in variables", async () => {
      mockPost.mockResolvedValueOnce({ data: validRow });

      await submitApplication({
        serviceId: "svc-1",
        versionId: "ver-1",
        applicationId: "app-1",
      });

      const [, , config] = mockPost.mock.calls[0];
      expect(config).toEqual({ params: { locale: "en" } });
    });

    it("Should send an empty object body", async () => {
      mockPost.mockResolvedValueOnce({ data: validRow });

      await submitApplication({
        serviceId: "svc-1",
        versionId: "ver-1",
        applicationId: "app-1",
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body).toEqual({});
    });
  });

  describe("response parsing", () => {
    it("Should parse a { data: row } envelope through ApplicationDto when the API wraps the response", async () => {
      mockPost.mockResolvedValueOnce({ data: { data: validRow } });

      const parsed = await submitApplication({
        serviceId: "svc-1",
        versionId: "ver-1",
        applicationId: "app-1",
      });

      expect(parsed).toEqual(validRow);
      expect(parsed.id).toBe(validRow.id);
      expect(parsed.serviceApplicationType).toBe("workflow");
    });

    it("Should parse a top-level applications row through ApplicationDto and return it", async () => {
      mockPost.mockResolvedValueOnce({ data: validRow });

      const parsed = await submitApplication({
        serviceId: "svc-1",
        versionId: "ver-1",
        applicationId: "app-1",
      });

      expect(parsed).toEqual(validRow);
      expect(parsed.metadata).toEqual({
        executionId: "129",
        submissionIds: [],
      });
    });

    it("Should reject with a Zod error when the response body does not match ApplicationDto", async () => {
      mockPost.mockResolvedValueOnce({
        data: { id: "not-a-uuid", missing: "fields" },
      });

      await expect(
        submitApplication({
          serviceId: "svc-1",
          versionId: "ver-1",
          applicationId: "app-1",
        }),
      ).rejects.toThrow();
    });
  });

  describe("error propagation", () => {
    it("Should reject with the axios error when the underlying POST fails", async () => {
      const axiosError = new Error("Network failure");
      mockPost.mockRejectedValueOnce(axiosError);

      await expect(
        submitApplication({
          serviceId: "svc-1",
          versionId: "ver-1",
          applicationId: "app-1",
        }),
      ).rejects.toThrow("Network failure");
    });
  });
});
