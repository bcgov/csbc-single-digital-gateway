import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { consentManagerApi } from "../../../api/consent-manager-api.client";

const ConsentStatementResponseDto = z.object({
  id: z.string(),
  document: z.object({
    name: z.string(),
    organizationId: z.string(),
  }),
  version: z.object({
    content: z.record(z.string(), z.any()),
  }),
  status: z.enum(["granted", "revoked"]),
  createdAt: z.string(),
});

export type ConsentStatementResponse = z.infer<
  typeof ConsentStatementResponseDto
>;

export function consentStatementQueryOptions(statementId: string) {
  return queryOptions({
    queryKey: ["consent-statement", statementId],
    queryFn: async () => {
      const { data } = await consentManagerApi.get(
        `/api/v1/statements/${statementId}`,
      );
      return ConsentStatementResponseDto.parse(data);
    },
  });
}
