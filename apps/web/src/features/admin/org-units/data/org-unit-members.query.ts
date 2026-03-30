import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../../api/api.client";

export const MemberDto = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
  name: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export type Member = z.infer<typeof MemberDto>;

export function orgUnitMembersQueryOptions(orgUnitId: string) {
  return queryOptions({
    queryKey: ["org-units", orgUnitId, "members"],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/org-units/${orgUnitId}/members`,
      );
      return z.array(MemberDto).parse(data);
    },
  });
}
