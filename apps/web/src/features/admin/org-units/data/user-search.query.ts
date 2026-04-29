import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

const SearchUserResult = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export type SearchUser = z.infer<typeof SearchUserResult>;

export function userSearchQueryOptions(orgUnitId: string, query: string) {
  return queryOptions({
    queryKey: ["org-units", orgUnitId, "members", "search", query],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/org-units/${orgUnitId}/members/search`,
        { params: { q: query } },
      );
      return z.array(SearchUserResult).parse(data);
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
