import { applicationMessagesQueryOptions } from "../data/application-messages.query";
import { useExponentialBackoffPoll } from "./use-exponential-backoff-poll.hook";

export function useApplicationMessages(applicationId: string) {
  return useExponentialBackoffPoll({
    queryOptions: applicationMessagesQueryOptions(applicationId),
  });
}
