import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";
import { OrgUnitDto } from "./org-units.query";

export function orgUnitChildrenQueryOptions(orgUnitId: string) {
  return queryOptions({
    queryKey: ["org-units", orgUnitId, "children"],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/org-units/${orgUnitId}/children`,
      );
      return z.array(OrgUnitDto).parse(data);
    },
  });
}

export function allowedChildTypesQueryOptions(orgUnitId: string) {
  return queryOptions({
    queryKey: ["org-units", orgUnitId, "allowed-child-types"],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/org-units/${orgUnitId}/allowed-child-types`,
      );
      return z.array(z.string()).parse(data);
    },
  });
}
