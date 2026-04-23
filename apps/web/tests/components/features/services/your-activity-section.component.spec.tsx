import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockUseBcscAuth = jest.fn();
const mockUseQuery = jest.fn();

jest.mock("src/features/auth/auth.context", () => ({
  useBcscAuth: (...args: unknown[]) => mockUseBcscAuth(...args),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock("src/features/services/data/applications.query", () => ({
  applicationsForServiceQueryOptions: jest.fn((vars: unknown) => ({
    queryKey: ["applications-query-options", vars],
    queryFn: jest.fn(),
  })),
}));

jest.mock(
  "src/features/services/components/your-activity-skeleton.component",
  () => ({
    YourActivitySkeleton: () => <div data-testid="skeleton" />,
  }),
);

jest.mock(
  "src/features/services/components/your-activity-list.component",
  () => ({
    YourActivityList: ({
      items,
      serviceId,
    }: {
      items: { id: string }[];
      serviceId: string;
    }) => (
      <div data-testid="list" data-service-id={serviceId}>
        {items.length} items
      </div>
    ),
  }),
);

jest.mock(
  "src/features/services/components/your-activity-error.component",
  () => ({
    YourActivityError: ({ onRetry }: { onRetry: () => void }) => (
      <button data-testid="error" onClick={onRetry}>
        retry
      </button>
    ),
  }),
);

import { YourActivitySection } from "src/features/services/components/your-activity-section.component";

const makeAuth = (isAuthenticated: boolean) => ({
  isAuthenticated,
  isLoading: false,
  user: isAuthenticated ? { sub: "abc" } : null,
  login: jest.fn(),
  logout: jest.fn(),
});

describe("YourActivitySection Component Test", () => {
  beforeEach(() => {
    mockUseBcscAuth.mockReset();
    mockUseQuery.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render null entirely when useBcscAuth().isAuthenticated is false", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(false));
    mockUseQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { container } = render(<YourActivitySection serviceId="svc-1" />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Your activity")).not.toBeInTheDocument();
  });

  it("Should pass enabled: isAuthenticated through to useQuery so no request is made while logged out", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(false));
    mockUseQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    const queryArg = mockUseQuery.mock.calls[0][0];
    expect(queryArg.enabled).toBe(false);
  });

  it("Should render the YourActivitySkeleton while the query is pending", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error")).not.toBeInTheDocument();
  });

  it("Should render the YourActivityError banner when the query errors", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    expect(screen.getByTestId("error")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("Should refetch the query when the user clicks 'Try again'", () => {
    const refetch = jest.fn();
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch,
    });

    render(<YourActivitySection serviceId="svc-1" />);

    fireEvent.click(screen.getByTestId("error"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("Should render the empty-state copy 'No applications yet.' when items.length is 0", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 5 },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    expect(screen.getByText("No applications yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("list")).not.toBeInTheDocument();
  });

  it("Should render the YourActivityList when items are present", () => {
    const items = [
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        serviceApplicationTitle: "A",
        createdAt: "2026-04-22T12:00:00Z",
      },
    ];
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: { items, total: 1, page: 1, limit: 5 },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    const list = screen.getByTestId("list");
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("data-service-id", "svc-1");
    expect(list).toHaveTextContent("1 items");
  });

  it("Should render 'Showing the 5 most recent of N applications.' hint only when total > items.length", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `id-${i}`,
      serviceApplicationTitle: "A",
      createdAt: "2026-04-22T12:00:00Z",
    }));
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: { items, total: 12, page: 1, limit: 5 },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    expect(
      screen.getByText(/Showing the 5 most recent of 12 applications\./),
    ).toBeInTheDocument();
  });

  it("Should NOT render the overflow hint when total equals items.length", () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      id: `id-${i}`,
      serviceApplicationTitle: "A",
      createdAt: "2026-04-22T12:00:00Z",
    }));
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: { items, total: 3, page: 1, limit: 5 },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<YourActivitySection serviceId="svc-1" />);

    expect(
      screen.queryByText(/Showing the .* most recent of/),
    ).not.toBeInTheDocument();
  });
});
