import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api/api.client";

export function useCreateDocumentType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      description: string;
      schema?: Record<string, unknown>;
      uiSchema?: Record<string, unknown>;
    }) => {
      const { data } = await api.post(
        "/admin/consent/document-types",
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-document-types"],
      });
    },
  });
}

export function useCreateTypeVersion(typeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/consent/document-types/${typeId}/versions`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-document-types", typeId],
      });
    },
  });
}

export function useUpsertTypeVersionTranslation(
  typeId: string,
  versionId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      locale: string;
      name: string;
      description: string;
      schema?: Record<string, unknown>;
      uiSchema?: Record<string, unknown>;
    }) => {
      const { data } = await api.put(
        `/admin/consent/document-types/${typeId}/versions/${versionId}/translations/${body.locale}`,
        {
          name: body.name,
          description: body.description,
          schema: body.schema ?? {},
          uiSchema: body.uiSchema ?? {},
        },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-document-types", typeId, "versions", versionId],
      });
    },
  });
}

export function usePublishTypeVersion(typeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/consent/document-types/${typeId}/versions/${versionId}/publish`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-document-types", typeId],
      });
    },
  });
}

export function useArchiveTypeVersion(typeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/consent/document-types/${typeId}/versions/${versionId}/archive`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["consent-document-types", typeId],
      });
    },
  });
}
