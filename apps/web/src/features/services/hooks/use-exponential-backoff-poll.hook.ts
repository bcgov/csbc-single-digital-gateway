import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

interface BackoffPollArgs<T, K extends QueryKey> {
  queryOptions: UseQueryOptions<T, Error, T, K>;
  initialMs?: number;
  maxMs?: number;
}

interface BackoffPollResult<T> {
  query: UseQueryResult<T, Error>;
  reset: () => void;
}

const DEFAULT_INITIAL_MS = 2_000;
const DEFAULT_MAX_MS = 60_000;

export function useExponentialBackoffPoll<T, K extends QueryKey>(
  args: BackoffPollArgs<T, K>,
): BackoffPollResult<T> {
  const initial = args.initialMs ?? DEFAULT_INITIAL_MS;
  const max = args.maxMs ?? DEFAULT_MAX_MS;

  const [intervalMs, setIntervalMs] = useState(initial);
  const mountedRef = useRef(false);
  const skipNextAdvanceRef = useRef(false);

  const query = useQuery({
    ...args.queryOptions,
    refetchInterval: intervalMs,
    refetchOnWindowFocus: true,
  });

  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (skipNextAdvanceRef.current) {
      skipNextAdvanceRef.current = false;
      return;
    }
    setIntervalMs((prev) => Math.min(prev * 2, max));
  }, [query.dataUpdatedAt, max]);

  const reset = useCallback(() => {
    skipNextAdvanceRef.current = true;
    setIntervalMs(initial);
    void refetchRef.current();
  }, [initial]);

  return { query, reset };
}
