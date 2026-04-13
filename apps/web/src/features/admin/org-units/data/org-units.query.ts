import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

export const OrgUnitDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(["org", "ministry", "division", "branch", "team"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrgUnit = z.infer<typeof OrgUnitDto>;

const OrgUnitsPageDto = z.object({
  data: z.array(OrgUnitDto),
  total: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type OrgUnitsPage = z.infer<typeof OrgUnitsPageDto>;

export function orgUnitsQueryOptions(page = 1, limit = 10) {
  return queryOptions({
    queryKey: ["org-units", { page, limit }],
    queryFn: async () => {
      const { data } = await api.get("/admin/org-units", {
        params: { page, limit },
      });
      return OrgUnitsPageDto.parse(data);
    },
  });
}

export function orgUnitQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["org-units", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/org-units/${id}`);
      return OrgUnitDto.parse(data);
    },
  });
}
