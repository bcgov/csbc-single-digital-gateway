import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children?: React.ReactNode }) => <td>{children}</td>,
  Badge: ({ children, variant }: { children?: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconTrash: () => <span data-testid="icon-trash" />,
}));

import { ContributorsTable } from "src/features/admin/consent-documents/components/contributors-table.component";

type Contributor = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
};

const makeContributor = (overrides: Partial<Contributor> = {}): Contributor => ({
  userId: "user-cccc-1111-dddd-2222eeee3333",
  name: "Maria Gonzalez",
  email: "maria.gonzalez@gov.bc.ca",
  role: "owner",
  createdAt: "2024-10-05T07:30:00.000Z",
  ...overrides,
});

describe("ContributorsTable", () => {
  const onRemove = jest.fn();

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should show empty message when contributors array is empty", () => {
      render(<ContributorsTable contributors={[]} onRemove={onRemove} />);

      expect(screen.getByText("No contributors.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Column headers", () => {
    it("should render all expected column headers when contributors exist", () => {
      render(<ContributorsTable contributors={[makeContributor()]} onRemove={onRemove} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Joined")).toBeInTheDocument();
    });
  });

  describe("Row rendering", () => {
    it("should render one row per contributor", () => {
      const contributors = [
        makeContributor({ userId: "user-cd-001", name: "First Contributor" }),
        makeContributor({ userId: "user-cd-002", name: "Second Contributor" }),
      ];

      render(<ContributorsTable contributors={contributors} onRemove={onRemove} />);

      expect(screen.getByText("First Contributor")).toBeInTheDocument();
      expect(screen.getByText("Second Contributor")).toBeInTheDocument();
    });

    it("should display Unnamed when name is null", () => {
      render(
        <ContributorsTable
          contributors={[makeContributor({ name: null })]}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("Unnamed")).toBeInTheDocument();
    });

    it("should display contributor email", () => {
      render(
        <ContributorsTable
          contributors={[makeContributor({ email: "contributor@example.bc.ca" })]}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("contributor@example.bc.ca")).toBeInTheDocument();
    });

    it("should display em dash when email is null", () => {
      render(
        <ContributorsTable
          contributors={[makeContributor({ email: null })]}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should display contributor role in a badge with outline variant", () => {
      render(
        <ContributorsTable
          contributors={[makeContributor({ role: "reviewer" })]}
          onRemove={onRemove}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("reviewer");
      expect(badge).toHaveAttribute("data-variant", "outline");
    });

    it("should render correct roles for multiple contributors", () => {
      const contributors = [
        makeContributor({ userId: "cd-user-001", role: "owner" }),
        makeContributor({ userId: "cd-user-002", role: "editor" }),
      ];

      render(<ContributorsTable contributors={contributors} onRemove={onRemove} />);

      const badges = screen.getAllByTestId("badge");
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("owner");
      expect(badges[1]).toHaveTextContent("editor");
    });
  });

  describe("Remove action", () => {
    it("should call onRemove with the full contributor object when remove button is clicked", () => {
      const contributor = makeContributor({
        userId: "cd-user-remove-xyz",
        name: "Person to Remove",
        role: "editor",
      });

      render(<ContributorsTable contributors={[contributor]} onRemove={onRemove} />);

      const trashIcon = screen.getByTestId("icon-trash");
      fireEvent.click(trashIcon.closest("button")!);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith(contributor);
    });

    it("should call onRemove with the correct contributor when multiple are displayed", () => {
      const contributors = [
        makeContributor({ userId: "cd-keep-aaa", name: "Stay Here" }),
        makeContributor({ userId: "cd-remove-bbb", name: "Go Away" }),
        makeContributor({ userId: "cd-keep-ccc", name: "Stay Too" }),
      ];

      render(<ContributorsTable contributors={contributors} onRemove={onRemove} />);

      const trashIcons = screen.getAllByTestId("icon-trash");
      fireEvent.click(trashIcons[1].closest("button")!);

      expect(onRemove).toHaveBeenCalledWith(contributors[1]);
      expect(onRemove).not.toHaveBeenCalledWith(contributors[0]);
      expect(onRemove).not.toHaveBeenCalledWith(contributors[2]);
    });

    it("should call onRemove exactly once per click", () => {
      render(
        <ContributorsTable
          contributors={[makeContributor()]}
          onRemove={onRemove}
        />,
      );

      const trashIcon = screen.getByTestId("icon-trash");
      fireEvent.click(trashIcon.closest("button")!);
      fireEvent.click(trashIcon.closest("button")!);

      expect(onRemove).toHaveBeenCalledTimes(2);
    });
  });
});
