import { queryOptions } from "@tanstack/react-query";
import { api } from "../../../api/api.client";
import { WorkflowMessagesResponseDto } from "../application-messages.dto";

export function applicationMessagesQueryOptions(applicationId: string) {
  return queryOptions({
    queryKey: ["applications", applicationId, "messages"] as const,
    queryFn: async () => {
      const { data } = await api.get(
        `/v1/me/applications/${applicationId}/messages`,
      );
      return WorkflowMessagesResponseDto.parse(data);
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: false,
  });
}
