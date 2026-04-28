import { api } from "../../../api/api.client";
import { ApplicationDto } from "../application.dto";

export interface SubmitApplicationVariables {
  serviceId: string;
  versionId: string;
  applicationId: string;
  locale?: string;
}

export async function submitApplication(vars: SubmitApplicationVariables) {
  const response = await api.post(
    `/v1/services/${vars.serviceId}/versions/${vars.versionId}/apply/${vars.applicationId}`,
    {},
    { params: { locale: vars.locale ?? "en" } },
  );
  return ApplicationDto.parse(response.data?.data ?? response.data);
}
