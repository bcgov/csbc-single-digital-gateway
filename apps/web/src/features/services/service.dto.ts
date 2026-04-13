import { z } from "zod";

export const ServiceDto = z.object({
  id: z.string().uuid(),
  serviceTypeId: z.string().uuid().nullable().optional(),
  orgUnitId: z.string().uuid().nullable().optional(),
  versionId: z.string().uuid().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceDto = z.infer<typeof ServiceDto>;
