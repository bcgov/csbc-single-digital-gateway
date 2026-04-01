import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

export const ServiceTypeVersionTranslationDto = z.object({
  id: z.string().uuid(),
  serviceTypeVersionId: z.string().uuid(),
  locale: z.string(),
  name: z.string(),
  description: z.string(),
  schema: z.record(z.string(), z.unknown()),
  uiSchema: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceTypeVersionTranslation = z.infer<
  typeof ServiceTypeVersionTranslationDto
>;

export const ServiceTypeVersionSummaryDto = z.object({
  id: z.string().uuid(),
  version: z.number(),
  status: z.enum(["draft", "published", "archived"]),
  name: z.string().nullable(),
  description: z.string().nullable(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceTypeVersionSummary = z.infer<
  typeof ServiceTypeVersionSummaryDto
>;

export const ServiceTypeVersionDto =
  ServiceTypeVersionSummaryDto.extend({
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    serviceTypeId: z.string().uuid(),
    translations: z.array(ServiceTypeVersionTranslationDto),
  });

export type ServiceTypeVersion = z.infer<
  typeof ServiceTypeVersionDto
>;

export const ServiceTypeDto = z.object({
  id: z.string().uuid(),
  publishedServiceTypeVersionId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedVersion: ServiceTypeVersionDto.nullable(),
  versions: z.array(ServiceTypeVersionSummaryDto),
});

export type ServiceType = z.infer<typeof ServiceTypeDto>;

const ServiceTypeListItemDto = z.object({
  id: z.string().uuid(),
  publishedServiceTypeVersionId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  updatesPending: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ServiceTypesPageDto = z.object({
  docs: z.array(ServiceTypeListItemDto),
  totalDocs: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ServiceTypesPage = z.infer<
  typeof ServiceTypesPageDto
>;

export type ServiceTypeListItem = z.infer<
  typeof ServiceTypeListItemDto
>;

export function serviceTypesQueryOptions(page = 1, limit = 10) {
  return queryOptions({
    queryKey: ["service-types", { page, limit }],
    queryFn: async () => {
      const { data } = await api.get("/admin/service-types", {
        params: { page, limit },
      });
      return ServiceTypesPageDto.parse(data);
    },
  });
}

export function serviceTypeQueryOptions(typeId: string) {
  return queryOptions({
    queryKey: ["service-types", typeId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/service-types/${typeId}`,
      );
      return ServiceTypeDto.parse(data);
    },
  });
}

export function serviceTypeVersionQueryOptions(
  typeId: string,
  versionId: string,
) {
  return queryOptions({
    queryKey: ["service-types", typeId, "versions", versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/service-types/${typeId}/versions/${versionId}`,
      );
      return ServiceTypeVersionDto.parse(data);
    },
  });
}
