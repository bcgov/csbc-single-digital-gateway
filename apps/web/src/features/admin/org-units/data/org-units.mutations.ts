import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../api/api.client";

export function useSyncMinistries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ synced: number }>(
        "/admin/org-units/sync-ministries",
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-units"] });
    },
  });
}

export function useCreateChildOrgUnit(parentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { name: string; type: string }) => {
      const { data } = await api.post(
        `/admin/org-units/${parentId}/children`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-units", parentId, "children"],
      });
    },
  });
}

export function useAddMember(orgUnitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { userId: string; role: "admin" | "member" }) => {
      const { data } = await api.post(
        `/admin/org-units/${orgUnitId}/members`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-units", orgUnitId, "members"],
      });
    },
  });
}

export function useRemoveMember(orgUnitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data } = await api.delete(
        `/admin/org-units/${orgUnitId}/members/${memberId}`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-units", orgUnitId, "members"],
      });
    },
  });
}
