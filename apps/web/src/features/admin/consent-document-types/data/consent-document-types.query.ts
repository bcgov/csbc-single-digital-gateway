import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

export const ConsentDocumentTypeVersionTranslationDto = z.object({
  id: z.string().uuid(),
  consentDocumentTypeVersionId: z.string().uuid(),
  locale: z.string(),
  name: z.string(),
  description: z.string(),
  schema: z.record(z.string(), z.unknown()),
  uiSchema: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConsentDocumentTypeVersionTranslation = z.infer<
  typeof ConsentDocumentTypeVersionTranslationDto
>;

export const ConsentDocumentTypeVersionSummaryDto = z.object({
  id: z.string().uuid(),
  version: z.number(),
  status: z.enum(["draft", "published", "archived"]),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConsentDocumentTypeVersionSummary = z.infer<
  typeof ConsentDocumentTypeVersionSummaryDto
>;

export const ConsentDocumentTypeVersionDto =
  ConsentDocumentTypeVersionSummaryDto.extend({
    consentDocumentTypeId: z.string().uuid(),
    translations: z.array(ConsentDocumentTypeVersionTranslationDto),
  });

export type ConsentDocumentTypeVersion = z.infer<
  typeof ConsentDocumentTypeVersionDto
>;

export const ConsentDocumentTypeDto = z.object({
  id: z.string().uuid(),
  publishedConsentDocumentTypeVersionId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedVersion: ConsentDocumentTypeVersionDto.nullable(),
  versions: z.array(ConsentDocumentTypeVersionSummaryDto),
});

export type ConsentDocumentType = z.infer<typeof ConsentDocumentTypeDto>;

const ConsentDocumentTypeListItemDto = z.object({
  id: z.string().uuid(),
  publishedConsentDocumentTypeVersionId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ConsentDocumentTypesPageDto = z.object({
  docs: z.array(ConsentDocumentTypeListItemDto),
  totalDocs: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ConsentDocumentTypesPage = z.infer<
  typeof ConsentDocumentTypesPageDto
>;

export type ConsentDocumentTypeListItem = z.infer<
  typeof ConsentDocumentTypeListItemDto
>;

export function documentTypesQueryOptions(page = 1, limit = 10) {
  return queryOptions({
    queryKey: ["consent-document-types", { page, limit }],
    queryFn: async () => {
      const { data } = await api.get("/admin/consent/document-types", {
        params: { page, limit },
      });
      return ConsentDocumentTypesPageDto.parse(data);
    },
  });
}

export function documentTypeQueryOptions(typeId: string) {
  return queryOptions({
    queryKey: ["consent-document-types", typeId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/consent/document-types/${typeId}`,
      );
      return ConsentDocumentTypeDto.parse(data);
    },
  });
}

export function documentTypeVersionQueryOptions(
  typeId: string,
  versionId: string,
) {
  return queryOptions({
    queryKey: ["consent-document-types", typeId, "versions", versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/consent/document-types/${typeId}/versions/${versionId}`,
      );
      return ConsentDocumentTypeVersionDto.parse(data);
    },
  });
}
