import { queryOptions } from "@tanstack/react-query";
import { api } from "../../../api/api.client";
import {
  ApplicationsListResponseDto,
  EnrichedApplicationDto,
} from "../application.dto";

interface ApplicationsForServiceQueryVars {
  serviceId: string;
  page: number;
  limit: number;
}

export function applicationsForServiceQueryOptions(
  vars: ApplicationsForServiceQueryVars,
) {
  return queryOptions({
    queryKey: [
      "services",
      vars.serviceId,
      "applications",
      { page: vars.page, limit: vars.limit },
    ],
    queryFn: async () => {
      const { data } = await api.get(
        `/v1/services/${vars.serviceId}/applications`,
        { params: { page: vars.page, limit: vars.limit } },
      );
      return ApplicationsListResponseDto.parse(data);
    },
    staleTime: 30_000,
  });
}

export function applicationQueryOptions(applicationId: string) {
  return queryOptions({
    queryKey: ["applications", applicationId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/me/applications/${applicationId}`);
      return EnrichedApplicationDto.parse(data);
    },
    staleTime: 30_000,
  });
}
