import { queryOptions } from "@tanstack/react-query";
import { consentManagerApi } from "../../../api/consent-manager-api.client";
import { ConsentDocumentDto } from "../consent-document.dto";

export function consentDocumentsByIdQueryOptions(documentIds: string[]) {
  const sortedIds = [...documentIds].sort();

  return queryOptions({
    queryKey: ["consent-documents-by-id", ...sortedIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        sortedIds.map(async (id) => {
          const { data } = await consentManagerApi.get(
            `/api/v1/consent-documents/${id}`,
          );
          return ConsentDocumentDto.parse(data);
        }),
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<ConsentDocumentDto> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);
    },
    enabled: sortedIds.length > 0,
  });
}

export function consentDocumentsQueryOptions(documentIds: string[]) {
  const sortedIds = [...documentIds].sort();

  return queryOptions({
    queryKey: ["consent-documents", ...sortedIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        sortedIds.map(async (id) => {
          const { data } = await consentManagerApi.get(
            `/api/v1/consent-documents/${id}`,
          );
          return ConsentDocumentDto.parse(data);
        }),
      );
      const documents = results
        .filter(
          (r): r is PromiseFulfilledResult<ConsentDocumentDto> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      const unconsented = await Promise.all(
        documents.map(async (doc) => {
          const { data } = await consentManagerApi.get(`/api/v1/statements`, {
            params: { documentId: doc.id, limit: 1 },
          });
          const statements = Array.isArray(data.docs) ? data.docs : [];
          const latest = statements[0];

          if (
            latest &&
            latest.version?.id === doc.versionId &&
            latest.status === "granted"
          ) {
            return null;
          }
          return doc;
        }),
      );
      return unconsented.filter(
        (doc): doc is ConsentDocumentDto => doc !== null,
      );
    },
    enabled: sortedIds.length > 0,
  });
}
