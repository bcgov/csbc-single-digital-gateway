const mockUseExponentialBackoffPoll = jest.fn();
const mockApplicationActionsQueryOptions = jest.fn();

jest.mock(
  "src/features/services/hooks/use-exponential-backoff-poll.hook",
  () => ({
    useExponentialBackoffPoll: (args: unknown) =>
      mockUseExponentialBackoffPoll(args),
  }),
);

jest.mock("src/features/services/data/application-actions.query", () => ({
  applicationActionsQueryOptions: (id: string) =>
    mockApplicationActionsQueryOptions(id),
}));

import { renderHook } from "@testing-library/react";
import { useApplicationActions } from "src/features/services/hooks/use-application-actions.hook";

const APPLICATION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("useApplicationActions", () => {
  beforeEach(() => {
    mockUseExponentialBackoffPoll.mockReset();
    mockApplicationActionsQueryOptions.mockReset();
    mockApplicationActionsQueryOptions.mockReturnValue({
      queryKey: ["applications", APPLICATION_ID, "actions"],
      queryFn: jest.fn(),
    });
    mockUseExponentialBackoffPoll.mockReturnValue({
      query: { data: undefined, isPending: true },
      reset: jest.fn(),
    });
  });

  it("invokes applicationActionsQueryOptions with the given applicationId", () => {
    renderHook(() => useApplicationActions(APPLICATION_ID));
    expect(mockApplicationActionsQueryOptions).toHaveBeenCalledWith(
      APPLICATION_ID,
    );
  });

  it("delegates to useExponentialBackoffPoll with the resolved queryOptions", () => {
    const queryOptions = {
      queryKey: ["applications", APPLICATION_ID, "actions"],
      queryFn: jest.fn(),
    };
    mockApplicationActionsQueryOptions.mockReturnValueOnce(queryOptions);

    renderHook(() => useApplicationActions(APPLICATION_ID));

    expect(mockUseExponentialBackoffPoll).toHaveBeenCalledWith({
      queryOptions,
    });
  });

  it("returns { query, reset } from useExponentialBackoffPoll unchanged", () => {
    const inner = {
      query: { data: { items: [] }, isPending: false },
      reset: jest.fn(),
    };
    mockUseExponentialBackoffPoll.mockReturnValueOnce(inner);

    const { result } = renderHook(() => useApplicationActions(APPLICATION_ID));

    expect(result.current).toBe(inner);
  });

  it("reset is referentially stable across re-renders when applicationId does not change", () => {
    const reset = jest.fn();
    mockUseExponentialBackoffPoll.mockReturnValue({
      query: { data: undefined },
      reset,
    });

    const { result, rerender } = renderHook(() =>
      useApplicationActions(APPLICATION_ID),
    );
    const reset1 = result.current.reset;

    rerender();
    const reset2 = result.current.reset;

    expect(reset1).toBe(reset2);
  });
});
