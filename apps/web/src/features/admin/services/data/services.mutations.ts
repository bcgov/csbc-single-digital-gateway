import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api/api.client";

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      await api.delete(`/admin/services/${serviceId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services"],
      });
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      serviceTypeId: string;
      orgUnitId: string;
      name: string;
      description?: string;
      content?: Record<string, unknown>;
    }) => {
      const { data } = await api.post("/admin/services", body);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services"],
      });
    },
  });
}

export function useCreateServiceVersion(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/services/${serviceId}/versions`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services", serviceId],
      });
    },
  });
}

export function useUpsertServiceTranslation(serviceId: string, versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      locale: string;
      name: string;
      description?: string;
      content: Record<string, unknown>;
    }) => {
      const { data } = await api.put(
        `/admin/services/${serviceId}/versions/${versionId}/translations/${body.locale}`,
        { name: body.name, description: body.description, content: body.content },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services", serviceId, "versions", versionId],
      });
    },
  });
}

export function usePublishServiceVersion(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/services/${serviceId}/versions/${versionId}/publish`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services", serviceId],
      });
    },
  });
}

export function useArchiveServiceVersion(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await api.post(
        `/admin/services/${serviceId}/versions/${versionId}/archive`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services", serviceId],
      });
    },
  });
}

export function useAddServiceContributor(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { userId: string; role: string }) => {
      const { data } = await api.post(
        `/admin/services/${serviceId}/contributors`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services", serviceId, "contributors"],
      });
    },
  });
}

export function useRemoveServiceContributor(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(
        `/admin/services/${serviceId}/contributors/${userId}`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["services", serviceId, "contributors"],
      });
    },
  });
}
