import { z } from "zod";

export const ApplicationDto = z.object({
  id: z.uuid(),
  serviceId: z.uuid(),
  serviceVersionId: z.uuid(),
  serviceVersionTranslationId: z.uuid(),
  serviceApplicationId: z.uuid(),
  serviceApplicationType: z.enum(["external", "workflow"]),
  userId: z.uuid(),
  delegateUserId: z.uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApplicationDto = z.infer<typeof ApplicationDto>;
