const mockUseQuery = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
}));

import { act, renderHook } from "@testing-library/react";
import { useExponentialBackoffPoll } from "src/features/services/hooks/use-exponential-backoff-poll.hook";

interface MockState {
  dataUpdatedAt: number;
  refetch: jest.Mock;
}

describe("useExponentialBackoffPoll", () => {
  let state: MockState;

  beforeEach(() => {
    state = { dataUpdatedAt: 0, refetch: jest.fn() };
    mockUseQuery.mockReset();
    mockUseQuery.mockImplementation(() => ({
      dataUpdatedAt: state.dataUpdatedAt,
      refetch: state.refetch,
    }));
  });

  const lastUseQueryArgs = (): {
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
  } => {
    const calls = mockUseQuery.mock.calls;
    return calls[calls.length - 1][0];
  };

  const baseQueryOptions = {
    queryKey: ["test"] as const,
    queryFn: async () => "value",
  };

  describe("initial state", () => {
    it("uses initialMs (default 2000) as the first refetchInterval", () => {
      renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );
      expect(lastUseQueryArgs().refetchInterval).toBe(2000);
    });

    it("uses a custom initialMs when provided", () => {
      renderHook(() =>
        useExponentialBackoffPoll({
          queryOptions: baseQueryOptions,
          initialMs: 5000,
        }),
      );
      expect(lastUseQueryArgs().refetchInterval).toBe(5000);
    });

    it("returns { query, reset } where reset is a function", () => {
      const { result } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );
      expect(typeof result.current.reset).toBe("function");
      expect(result.current.query).toBeDefined();
    });
  });

  describe("backoff progression", () => {
    it("doubles the refetchInterval after one successful poll (2000 → 4000)", () => {
      const { rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );
      expect(lastUseQueryArgs().refetchInterval).toBe(2000);

      act(() => {
        state.dataUpdatedAt = 1_000;
        rerender();
      });

      expect(lastUseQueryArgs().refetchInterval).toBe(4000);
    });

    it("continues doubling on each successful poll until it hits the cap", () => {
      const { rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );
      const seen: number[] = [];

      for (let t = 1; t <= 8; t++) {
        act(() => {
          state.dataUpdatedAt = t * 1000;
          rerender();
        });
        seen.push(lastUseQueryArgs().refetchInterval as number);
      }

      // After polls: 4000, 8000, 16000, 32000, 60000 (cap), 60000, 60000, 60000
      expect(seen[0]).toBe(4000);
      expect(seen[1]).toBe(8000);
      expect(seen[2]).toBe(16000);
      expect(seen[3]).toBe(32000);
      expect(seen[4]).toBe(60000);
    });

    it("caps the refetchInterval at maxMs (default 60_000)", () => {
      const { rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );

      for (let t = 1; t <= 20; t++) {
        act(() => {
          state.dataUpdatedAt = t * 1000;
          rerender();
        });
      }

      expect(lastUseQueryArgs().refetchInterval).toBe(60000);
    });

    it("uses a custom maxMs when provided", () => {
      const { rerender } = renderHook(() =>
        useExponentialBackoffPoll({
          queryOptions: baseQueryOptions,
          maxMs: 10_000,
        }),
      );

      for (let t = 1; t <= 20; t++) {
        act(() => {
          state.dataUpdatedAt = t * 1000;
          rerender();
        });
      }

      expect(lastUseQueryArgs().refetchInterval).toBe(10_000);
    });

    it("does NOT advance the backoff on a query error (only on dataUpdatedAt change)", () => {
      const { rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );

      // dataUpdatedAt stays at 0 — simulate a failing query
      act(() => {
        rerender();
        rerender();
        rerender();
      });

      expect(lastUseQueryArgs().refetchInterval).toBe(2000);
    });
  });

  describe("reset()", () => {
    it("sets the refetchInterval back to initialMs immediately", () => {
      const { result, rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );

      // advance interval through several polls
      for (let t = 1; t <= 4; t++) {
        act(() => {
          state.dataUpdatedAt = t * 1000;
          rerender();
        });
      }
      expect(lastUseQueryArgs().refetchInterval).toBe(32000);

      act(() => {
        result.current.reset();
      });

      expect(lastUseQueryArgs().refetchInterval).toBe(2000);
    });

    it("triggers an immediate refetch", () => {
      const { result } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );

      act(() => {
        result.current.reset();
      });

      expect(state.refetch).toHaveBeenCalledTimes(1);
    });

    it("does NOT cause the very next successful update to immediately double the interval (skip-next guard)", () => {
      const { result, rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );

      // get to a non-floor interval
      act(() => {
        state.dataUpdatedAt = 1_000;
        rerender();
      });
      expect(lastUseQueryArgs().refetchInterval).toBe(4000);

      // reset → interval back to 2000, skip flag set
      act(() => {
        result.current.reset();
      });
      expect(lastUseQueryArgs().refetchInterval).toBe(2000);

      // simulate the immediate refetch's dataUpdatedAt arriving
      act(() => {
        state.dataUpdatedAt = 2_000;
        rerender();
      });

      // skip flag consumed, interval stays at floor
      expect(lastUseQueryArgs().refetchInterval).toBe(2000);

      // next regular poll → now it doubles
      act(() => {
        state.dataUpdatedAt = 3_000;
        rerender();
      });
      expect(lastUseQueryArgs().refetchInterval).toBe(4000);
    });

    it("is referentially stable across renders when inputs do not change", () => {
      const { result, rerender } = renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );
      const reset1 = result.current.reset;

      rerender();
      const reset2 = result.current.reset;

      // Force a few state updates and re-renders
      act(() => {
        state.dataUpdatedAt = 1_000;
        rerender();
      });
      const reset3 = result.current.reset;

      expect(reset1).toBe(reset2);
      expect(reset2).toBe(reset3);
    });
  });

  describe("window focus", () => {
    it("passes refetchOnWindowFocus: true to the underlying useQuery call", () => {
      renderHook(() =>
        useExponentialBackoffPoll({ queryOptions: baseQueryOptions }),
      );
      expect(lastUseQueryArgs().refetchOnWindowFocus).toBe(true);
    });
  });
});
