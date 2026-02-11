import { z } from "zod";

export const ConsentDocumentDto = z.object({
  id: z.string(),
  versionId: z.string(),
  type: z.string(),
  name: z.string(),
  version: z.number(),
  content: z.record(z.string(), z.unknown()).nullable(),
  signOff: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConsentDocumentDto = z.infer<typeof ConsentDocumentDto>;
