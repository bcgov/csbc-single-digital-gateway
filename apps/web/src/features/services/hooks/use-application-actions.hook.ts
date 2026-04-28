import { applicationActionsQueryOptions } from "../data/application-actions.query";
import { useExponentialBackoffPoll } from "./use-exponential-backoff-poll.hook";

export function useApplicationActions(applicationId: string) {
  return useExponentialBackoffPoll({
    queryOptions: applicationActionsQueryOptions(applicationId),
  });
}
