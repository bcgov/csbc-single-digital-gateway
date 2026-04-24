import { cleanup, render, screen } from "@testing-library/react";

jest.mock(
  "src/features/services/components/application-process-entry.component",
  () => ({
    ApplicationProcessEntry: ({
      serviceId,
      versionId,
      applicationId,
      applicationLabel,
    }: {
      serviceId: string;
      versionId: string;
      applicationId: string;
      applicationLabel: string;
    }) => (
      <div
        data-testid="entry"
        data-service-id={serviceId}
        data-version-id={versionId}
        data-application-id={applicationId}
        data-application-label={applicationLabel}
      />
    ),
  }),
);

import { ApplicationProcessWidget } from "src/features/services/components/application-process-widget.component";

type AnyService = Parameters<typeof ApplicationProcessWidget>[0]["service"];

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const APP_EXTERNAL_ID = "33333333-3333-4333-8333-333333333333";
const APP_WORKFLOW_ID_1 = "44444444-4444-4444-8444-444444444444";
const APP_WORKFLOW_ID_2 = "55555555-5555-4555-8555-555555555555";

const workflowApp = (id: string, label: string) => ({
  id,
  label,
  type: "workflow" as const,
  config: {
    apiKey: "k",
    tenantId: "66666666-6666-4666-8666-666666666666",
    triggerEndpoint: "/w",
  },
});

const baseContent = {
  contactMethods: [],
  consents: [],
  resources: {
    legal: [],
    otherServices: { recommendedServices: [], relatedServices: [] },
    recommendedReading: [],
  },
};

const makeService = (overrides?: Partial<AnyService>): AnyService =>
  ({
    id: SERVICE_ID,
    versionId: VERSION_ID,
    name: "Some Service",
    description: null,
    createdAt: "2026-04-22T12:00:00.000Z",
    updatedAt: "2026-04-22T12:00:00.000Z",
    content: { ...baseContent, applications: [] },
    ...overrides,
  }) as AnyService;

afterEach(() => cleanup());

describe("<ApplicationProcessWidget />", () => {
  describe("rendering gate", () => {
    it("Should render null when service.content.applications has no workflow entries", () => {
      const service = makeService({
        content: {
          ...baseContent,
          applications: [
            {
              id: APP_EXTERNAL_ID,
              label: "External",
              type: "external" as const,
            },
          ],
        } as AnyService["content"],
      });
      const { container } = render(<ApplicationProcessWidget service={service} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("Should render null when service.content.applications is undefined", () => {
      const service = makeService({ content: undefined });
      const { container } = render(<ApplicationProcessWidget service={service} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("Should render null when service.versionId is nullish", () => {
      const service = makeService({
        versionId: null,
        content: {
          ...baseContent,
          applications: [workflowApp(APP_WORKFLOW_ID_1, "Guided")],
        } as AnyService["content"],
      });
      const { container } = render(<ApplicationProcessWidget service={service} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("Should filter out non-workflow entries (external, etc.) from the list of entries rendered", () => {
      const service = makeService({
        content: {
          ...baseContent,
          applications: [
            {
              id: APP_EXTERNAL_ID,
              label: "External",
              type: "external" as const,
            },
            workflowApp(APP_WORKFLOW_ID_1, "Guided"),
          ],
        } as AnyService["content"],
      });
      render(<ApplicationProcessWidget service={service} />);
      const entries = screen.getAllByTestId("entry");
      expect(entries).toHaveLength(1);
      expect(entries[0].dataset.applicationId).toBe(APP_WORKFLOW_ID_1);
    });
  });

  describe("rendering with workflow entries", () => {
    it("Should render the heading 'Application process' and intro copy once", () => {
      const service = makeService({
        content: {
          ...baseContent,
          applications: [workflowApp(APP_WORKFLOW_ID_1, "Guided")],
        } as AnyService["content"],
      });
      render(<ApplicationProcessWidget service={service} />);
      expect(screen.getAllByText("Application process")).toHaveLength(1);
      expect(
        screen.getByText(/what to expect when you apply/i),
      ).toBeInTheDocument();
    });

    it("Should render one <ApplicationProcessEntry> per workflow entry", () => {
      const service = makeService({
        content: {
          ...baseContent,
          applications: [
            workflowApp(APP_WORKFLOW_ID_1, "Guided"),
            workflowApp(APP_WORKFLOW_ID_2, "Alternate"),
          ],
        } as AnyService["content"],
      });
      render(<ApplicationProcessWidget service={service} />);
      expect(screen.getAllByTestId("entry")).toHaveLength(2);
    });

    it("Should pass serviceId, versionId, applicationId (entry.id) and applicationLabel (entry.label) to each entry", () => {
      const service = makeService({
        content: {
          ...baseContent,
          applications: [workflowApp(APP_WORKFLOW_ID_1, "Guided")],
        } as AnyService["content"],
      });
      render(<ApplicationProcessWidget service={service} />);
      const entry = screen.getByTestId("entry");
      expect(entry.dataset.serviceId).toBe(SERVICE_ID);
      expect(entry.dataset.versionId).toBe(VERSION_ID);
      expect(entry.dataset.applicationId).toBe(APP_WORKFLOW_ID_1);
      expect(entry.dataset.applicationLabel).toBe("Guided");
    });
  });
});
