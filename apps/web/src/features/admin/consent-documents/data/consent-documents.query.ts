import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

export const ConsentDocumentVersionTranslationDto = z.object({
  id: z.string().uuid(),
  consentDocumentVersionId: z.string().uuid(),
  locale: z.string(),
  content: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConsentDocumentVersionTranslation = z.infer<
  typeof ConsentDocumentVersionTranslationDto
>;

export const ConsentDocumentVersionSummaryDto = z.object({
  id: z.string().uuid(),
  version: z.number(),
  status: z.enum(["draft", "published", "archived"]),
  consentDocumentTypeVersionId: z.string().uuid(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConsentDocumentVersionSummary = z.infer<
  typeof ConsentDocumentVersionSummaryDto
>;

export const ConsentDocumentVersionDto =
  ConsentDocumentVersionSummaryDto.extend({
    consentDocumentId: z.string().uuid(),
    translations: z.array(ConsentDocumentVersionTranslationDto),
  });

export type ConsentDocumentVersion = z.infer<
  typeof ConsentDocumentVersionDto
>;

export const ContributorDto = z.object({
  userId: z.string().uuid(),
  role: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export type Contributor = z.infer<typeof ContributorDto>;

const ConsentDocumentListItemDto = z.object({
  id: z.string().uuid(),
  consentDocumentTypeId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  publishedConsentDocumentVersionId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConsentDocumentListItem = z.infer<
  typeof ConsentDocumentListItemDto
>;

export const ConsentDocumentDto = ConsentDocumentListItemDto.extend({
  publishedVersion: ConsentDocumentVersionDto.nullable(),
  versions: z.array(ConsentDocumentVersionSummaryDto),
});

export type ConsentDocument = z.infer<typeof ConsentDocumentDto>;

const ConsentDocumentsPageDto = z.object({
  docs: z.array(ConsentDocumentListItemDto),
  totalDocs: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ConsentDocumentsPage = z.infer<typeof ConsentDocumentsPageDto>;

export function consentDocumentsQueryOptions(
  page = 1,
  limit = 10,
  filters?: { orgUnitId?: string; consentDocumentTypeId?: string },
) {
  return queryOptions({
    queryKey: ["consent-documents", { page, limit, ...filters }],
    queryFn: async () => {
      const { data } = await api.get("/admin/consent/documents", {
        params: { page, limit, ...filters },
      });
      return ConsentDocumentsPageDto.parse(data);
    },
  });
}

export function consentDocumentQueryOptions(docId: string) {
  return queryOptions({
    queryKey: ["consent-documents", docId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/consent/documents/${docId}`);
      return ConsentDocumentDto.parse(data);
    },
  });
}

export function consentDocumentVersionQueryOptions(
  docId: string,
  versionId: string,
) {
  return queryOptions({
    queryKey: ["consent-documents", docId, "versions", versionId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/consent/documents/${docId}/versions/${versionId}`,
      );
      return ConsentDocumentVersionDto.parse(data);
    },
  });
}

export function consentDocumentContributorsQueryOptions(docId: string) {
  return queryOptions({
    queryKey: ["consent-documents", docId, "contributors"],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/consent/documents/${docId}/contributors`,
      );
      return z.array(ContributorDto).parse(data);
    },
  });
}
