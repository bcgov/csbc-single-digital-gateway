import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { consentManagerApi } from "../../../api/consent-manager-api.client";

const DocumentTypeDto = z.object({
  id: z.string(),
  name: z.string(),
});

export type DocumentType = z.infer<typeof DocumentTypeDto>;

export function documentTypesQueryOptions() {
  return queryOptions({
    queryKey: ["document-types"],
    queryFn: async () => {
      const { data } = await consentManagerApi.get(
        "/api/v1/lookups/document-types",
      );
      return z.object({ docs: z.array(DocumentTypeDto) }).parse(data).docs;
    },
  });
}
