const mockUseExponentialBackoffPoll = jest.fn();
const mockApplicationMessagesQueryOptions = jest.fn();

jest.mock(
  "src/features/services/hooks/use-exponential-backoff-poll.hook",
  () => ({
    useExponentialBackoffPoll: (args: unknown) =>
      mockUseExponentialBackoffPoll(args),
  }),
);

jest.mock("src/features/services/data/application-messages.query", () => ({
  applicationMessagesQueryOptions: (id: string) =>
    mockApplicationMessagesQueryOptions(id),
}));

import { renderHook } from "@testing-library/react";
import { useApplicationMessages } from "src/features/services/hooks/use-application-messages.hook";

const APPLICATION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("useApplicationMessages", () => {
  beforeEach(() => {
    mockUseExponentialBackoffPoll.mockReset();
    mockApplicationMessagesQueryOptions.mockReset();
    mockApplicationMessagesQueryOptions.mockReturnValue({
      queryKey: ["applications", APPLICATION_ID, "messages"],
      queryFn: jest.fn(),
    });
    mockUseExponentialBackoffPoll.mockReturnValue({
      query: { data: undefined, isPending: true },
      reset: jest.fn(),
    });
  });

  it("invokes applicationMessagesQueryOptions with the given applicationId", () => {
    renderHook(() => useApplicationMessages(APPLICATION_ID));
    expect(mockApplicationMessagesQueryOptions).toHaveBeenCalledWith(
      APPLICATION_ID,
    );
  });

  it("delegates to useExponentialBackoffPoll with the resolved queryOptions", () => {
    const queryOptions = {
      queryKey: ["applications", APPLICATION_ID, "messages"],
      queryFn: jest.fn(),
    };
    mockApplicationMessagesQueryOptions.mockReturnValueOnce(queryOptions);

    renderHook(() => useApplicationMessages(APPLICATION_ID));

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

    const { result } = renderHook(() => useApplicationMessages(APPLICATION_ID));

    expect(result.current).toBe(inner);
  });

  it("reset is referentially stable across re-renders when applicationId does not change", () => {
    const reset = jest.fn();
    mockUseExponentialBackoffPoll.mockReturnValue({
      query: { data: undefined },
      reset,
    });

    const { result, rerender } = renderHook(() =>
      useApplicationMessages(APPLICATION_ID),
    );
    const reset1 = result.current.reset;

    rerender();
    const reset2 = result.current.reset;

    expect(reset1).toBe(reset2);
  });
});
