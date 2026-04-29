const mockGet = jest.fn();

jest.mock("src/api/api.client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { applicationProcessQueryOptions } from "src/features/services/data/application-process.query";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const APPLICATION_ID = "33333333-3333-4333-8333-333333333333";

const validResponse = {
  applicationId: APPLICATION_ID,
  workflowId: "wf-abc",
  name: "Intake Workflow",
  steps: [
    { id: "node-a", label: "Submit form" },
    { id: "node-b", label: "Review", description: "Manual review step." },
  ],
};

describe("applicationProcessQueryOptions", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  describe("query key", () => {
    it("Should build a queryKey of ['services', serviceId, 'application-process', applicationId, { locale }]", () => {
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
        locale: "fr",
      });
      expect(options.queryKey).toEqual([
        "services",
        SERVICE_ID,
        "application-process",
        APPLICATION_ID,
        { locale: "fr" },
      ]);
    });

    it("Should default locale to 'en' in the queryKey when not provided", () => {
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
      expect(options.queryKey).toEqual([
        "services",
        SERVICE_ID,
        "application-process",
        APPLICATION_ID,
        { locale: "en" },
      ]);
    });
  });

  describe("queryFn — network request", () => {
    it("Should call api.get on /v1/services/:serviceId/versions/:versionId/application-process", async () => {
      mockGet.mockResolvedValueOnce({ data: validResponse });
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
      await options.queryFn!({} as never);
      expect(mockGet).toHaveBeenCalledWith(
        `/v1/services/${SERVICE_ID}/versions/${VERSION_ID}/application-process`,
        expect.any(Object),
      );
    });

    it("Should pass applicationId and locale as query params", async () => {
      mockGet.mockResolvedValueOnce({ data: validResponse });
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
        locale: "fr",
      });
      await options.queryFn!({} as never);
      const [, config] = mockGet.mock.calls[0];
      expect(config.params).toEqual({
        applicationId: APPLICATION_ID,
        locale: "fr",
      });
    });

    it("Should parse the response through ApplicationProcessResponseDto and return the parsed payload", async () => {
      mockGet.mockResolvedValueOnce({ data: validResponse });
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
      const result = await options.queryFn!({} as never);
      expect(result).toEqual(validResponse);
    });

    it("Should reject when the response fails ApplicationProcessResponseDto validation", async () => {
      mockGet.mockResolvedValueOnce({
        data: { ...validResponse, workflowId: 42 },
      });
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
      await expect(options.queryFn!({} as never)).rejects.toBeDefined();
    });
  });

  describe("options", () => {
    it("Should set staleTime to 60_000", () => {
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
      expect(options.staleTime).toBe(60_000);
    });

    it("Should set retry to false", () => {
      const options = applicationProcessQueryOptions({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
      expect(options.retry).toBe(false);
    });
  });
});
