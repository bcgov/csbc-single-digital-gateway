import { cleanup, render, screen } from "@testing-library/react";

const mockUseQuery = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock("src/features/services/data/application-process.query", () => ({
  applicationProcessQueryOptions: jest.fn((vars: unknown) => ({
    queryKey: ["application-process", vars],
    queryFn: jest.fn(),
  })),
}));

jest.mock(
  "src/features/services/components/application-process-skeleton.component",
  () => ({
    ApplicationProcessSkeleton: () => <div data-testid="skeleton" />,
  }),
);

import { applicationProcessQueryOptions } from "src/features/services/data/application-process.query";
import { ApplicationProcessEntry } from "src/features/services/components/application-process-entry.component";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const APPLICATION_ID = "33333333-3333-4333-8333-333333333333";

const props = {
  serviceId: SERVICE_ID,
  versionId: VERSION_ID,
  applicationId: APPLICATION_ID,
  applicationLabel: "Guided Application",
};

const successData = {
  applicationId: APPLICATION_ID,
  workflowId: "wf-1",
  name: "Intake Workflow",
  steps: [
    { id: "node-a", label: "Submit form", description: "Fill out the form." },
    { id: "node-b", label: "Review" },
    { id: "node-c", label: "Approval" },
  ],
};

beforeEach(() => {
  mockUseQuery.mockReset();
  (applicationProcessQueryOptions as jest.Mock).mockClear();
});

afterEach(() => cleanup());

describe("<ApplicationProcessEntry />", () => {
  describe("query wiring", () => {
    it("Should call applicationProcessQueryOptions with serviceId, versionId, applicationId from props", () => {
      mockUseQuery.mockReturnValue({ isPending: true, isError: false });
      render(<ApplicationProcessEntry {...props} />);
      expect(applicationProcessQueryOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: SERVICE_ID,
          versionId: VERSION_ID,
          applicationId: APPLICATION_ID,
        }),
      );
    });

    it("Should forward locale when provided via props", () => {
      mockUseQuery.mockReturnValue({ isPending: true, isError: false });
      render(<ApplicationProcessEntry {...props} locale="fr" />);
      expect(applicationProcessQueryOptions).toHaveBeenCalledWith(
        expect.objectContaining({ locale: "fr" }),
      );
    });
  });

  describe("loading state", () => {
    it("Should render <ApplicationProcessSkeleton /> while the query is pending", () => {
      mockUseQuery.mockReturnValue({ isPending: true, isError: false });
      render(<ApplicationProcessEntry {...props} />);
      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("Should render null when the query is in error state (silent drop)", () => {
      mockUseQuery.mockReturnValue({ isPending: false, isError: true });
      const { container } = render(<ApplicationProcessEntry {...props} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("Should NOT emit a toast on error", () => {
      // The component never imports sonner — if it did, this wouldn't compile.
      // Asserted here by searching for any element with role="status" (sonner's toast role).
      mockUseQuery.mockReturnValue({ isPending: false, isError: true });
      render(<ApplicationProcessEntry {...props} />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("Should render the data.name as the card title and applicationLabel as the subtitle", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: successData,
      });
      render(<ApplicationProcessEntry {...props} />);
      expect(screen.getByText("Intake Workflow")).toBeInTheDocument();
      expect(screen.getByText("Guided Application")).toBeInTheDocument();
    });

    it("Should render one list item per step, in the order returned by the API", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: successData,
      });
      render(<ApplicationProcessEntry {...props} />);
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent("Submit form");
      expect(items[1]).toHaveTextContent("Review");
      expect(items[2]).toHaveTextContent("Approval");
    });

    it("Should number the steps starting at 1", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: successData,
      });
      render(<ApplicationProcessEntry {...props} />);
      const items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveTextContent("1");
      expect(items[1]).toHaveTextContent("2");
      expect(items[2]).toHaveTextContent("3");
    });

    it("Should render step.label as primary text", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: successData,
      });
      render(<ApplicationProcessEntry {...props} />);
      expect(screen.getByText("Submit form")).toBeInTheDocument();
    });

    it("Should render step.description as secondary muted text when present", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: successData,
      });
      render(<ApplicationProcessEntry {...props} />);
      expect(screen.getByText("Fill out the form.")).toBeInTheDocument();
    });

    it("Should omit the description node from the DOM when step.description is undefined", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: successData,
      });
      render(<ApplicationProcessEntry {...props} />);
      const reviewItem = screen.getByText("Review").closest("li");
      expect(reviewItem?.textContent).not.toMatch(/Fill out the form/);
    });
  });

  describe("empty-steps state", () => {
    it("Should render the muted placeholder copy when data.steps is an empty array", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: { ...successData, steps: [] },
      });
      render(<ApplicationProcessEntry {...props} />);
      expect(
        screen.getByText(/process details will appear here/i),
      ).toBeInTheDocument();
    });

    it("Should still render the card header (title + subtitle) when data.steps is empty", () => {
      mockUseQuery.mockReturnValue({
        isPending: false,
        isError: false,
        data: { ...successData, steps: [] },
      });
      render(<ApplicationProcessEntry {...props} />);
      expect(screen.getByText("Intake Workflow")).toBeInTheDocument();
      expect(screen.getByText("Guided Application")).toBeInTheDocument();
    });
  });
});
