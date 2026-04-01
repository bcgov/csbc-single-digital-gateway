import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api/api.client";

export function useCreateServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      description: string;
      schema?: Record<string, unknown>;
      uiSchema?: Record<string, unknown>;
    }) => {
      const { data } = await api.post(
        "/admin/service-types",
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["service-types"],
      });
    },
  });
}

export function useDeleteServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (typeId: string) => {
      await api.delete(`/admin/service-types/${typeId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["service-types"],
      });
    },
  });
}

export function useCreateServiceTypeVersion(typeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/service-types/${typeId}/versions`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["service-types", typeId],
      });
    },
  });
}

export function useUpsertServiceTypeVersionTranslation(
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
        `/admin/service-types/${typeId}/versions/${versionId}/translations/${body.locale}`,
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
        queryKey: ["service-types", typeId, "versions", versionId],
      });
    },
  });
}

export function usePublishServiceTypeVersion(typeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/service-types/${typeId}/versions/${versionId}/publish`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["service-types", typeId],
      });
    },
  });
}

export function useArchiveServiceTypeVersion(typeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/service-types/${typeId}/versions/${versionId}/archive`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["service-types", typeId],
      });
    },
  });
}
