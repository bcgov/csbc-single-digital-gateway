import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api/api.client";

export function useCreateConsentDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      consentDocumentTypeId: string;
      orgUnitId: string;
    }) => {
      const { data } = await api.post("/admin/consent/documents", body);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents"],
      });
    },
  });
}

export function useCreateDocVersion(docId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { consentDocumentTypeVersionId: string }) => {
      const { data } = await api.post(
        `/admin/consent/documents/${docId}/versions`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents", docId],
      });
    },
  });
}

export function useUpsertDocTranslation(docId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      locale: string;
      content: Record<string, unknown>;
    }) => {
      const { data } = await api.put(
        `/admin/consent/documents/${docId}/versions/${versionId}/translations/${body.locale}`,
        { content: body.content },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents", docId, "versions", versionId],
      });
    },
  });
}

export function usePublishDocVersion(docId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/consent/documents/${docId}/versions/${versionId}/publish`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents", docId],
      });
    },
  });
}

export function useArchiveDocVersion(docId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/consent/documents/${docId}/versions/${versionId}/archive`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents", docId],
      });
    },
  });
}

export function useAddContributor(docId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { userId: string; role: string }) => {
      const { data } = await api.post(
        `/admin/consent/documents/${docId}/contributors`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents", docId, "contributors"],
      });
    },
  });
}

export function useRemoveContributor(docId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(
        `/admin/consent/documents/${docId}/contributors/${userId}`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-documents", docId, "contributors"],
      });
    },
  });
}
