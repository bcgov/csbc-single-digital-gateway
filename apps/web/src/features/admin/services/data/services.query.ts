import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

export const ServiceVersionTranslationDto = z.object({
  id: z.string().uuid(),
  serviceVersionId: z.string().uuid(),
  locale: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceVersionTranslation = z.infer<
  typeof ServiceVersionTranslationDto
>;

export const ServiceVersionSummaryDto = z.object({
  id: z.string().uuid(),
  version: z.number(),
  status: z.enum(["draft", "published", "archived"]),
  serviceTypeVersionId: z.string().uuid(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceVersionSummary = z.infer<
  typeof ServiceVersionSummaryDto
>;

export const ServiceVersionDto =
  ServiceVersionSummaryDto.extend({
    serviceId: z.string().uuid(),
    translations: z.array(ServiceVersionTranslationDto),
  });

export type ServiceVersion = z.infer<
  typeof ServiceVersionDto
>;

export const ContributorDto = z.object({
  userId: z.string().uuid(),
  role: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export type Contributor = z.infer<typeof ContributorDto>;

const ServiceListItemDto = z.object({
  id: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  publishedServiceVersionId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceListItem = z.infer<
  typeof ServiceListItemDto
>;

export const ServiceDto = ServiceListItemDto.extend({
  publishedVersion: ServiceVersionDto.nullable(),
  versions: z.array(ServiceVersionSummaryDto),
});

export type Service = z.infer<typeof ServiceDto>;

const ServicesPageDto = z.object({
  docs: z.array(ServiceListItemDto),
  totalDocs: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ServicesPage = z.infer<typeof ServicesPageDto>;

export function servicesQueryOptions(
  page = 1,
  limit = 10,
  filters?: { orgUnitId?: string },
) {
  return queryOptions({
    queryKey: ["services", { page, limit, ...filters }],
    queryFn: async () => {
      const { data } = await api.get("/admin/services", {
        params: { page, limit, ...filters },
      });
      return ServicesPageDto.parse(data);
    },
  });
}

export function serviceQueryOptions(serviceId: string) {
  return queryOptions({
    queryKey: ["services", serviceId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/services/${serviceId}`);
      return ServiceDto.parse(data);
    },
  });
}

export function serviceVersionQueryOptions(
  serviceId: string,
  versionId: string,
) {
  return queryOptions({
    queryKey: ["services", serviceId, "versions", versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/services/${serviceId}/versions/${versionId}`,
      );
      return ServiceVersionDto.parse(data);
    },
  });
}

export function serviceContributorsQueryOptions(serviceId: string) {
  return queryOptions({
    queryKey: ["services", serviceId, "contributors"],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/services/${serviceId}/contributors`,
      );
      return z.array(ContributorDto).parse(data);
    },
  });
}
