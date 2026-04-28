import { queryOptions } from "@tanstack/react-query";
import { api } from "../../../api/api.client";
import { WorkflowActionsResponseDto } from "../application-actions.dto";

export function applicationActionsQueryOptions(applicationId: string) {
  return queryOptions({
    queryKey: ["applications", applicationId, "actions"] as const,
    queryFn: async () => {
      const { data } = await api.get(
        `/v1/me/applications/${applicationId}/actions`,
      );
      return WorkflowActionsResponseDto.parse(data);
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: false,
  });
}
