import { queryOptions } from "@tanstack/react-query";
import { api } from "../../../api/api.client";
import { ApplicationProcessResponseDto } from "../application-process.dto";

interface ApplicationProcessQueryVars {
  serviceId: string;
  versionId: string;
  applicationId: string;
  locale?: string;
}

export function applicationProcessQueryOptions(
  vars: ApplicationProcessQueryVars,
) {
  const locale = vars.locale ?? "en";
  return queryOptions({
    queryKey: [
      "services",
      vars.serviceId,
      "application-process",
      vars.applicationId,
      { locale },
    ] as const,
    queryFn: async () => {
      const { data } = await api.get(
        `/v1/services/${vars.serviceId}/versions/${vars.versionId}/application-process`,
        { params: { applicationId: vars.applicationId, locale } },
      );
      return ApplicationProcessResponseDto.parse(data);
    },
    staleTime: 60_000,
    retry: false,
  });
}
