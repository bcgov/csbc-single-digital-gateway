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

export const EnrichedApplicationDto = ApplicationDto.extend({
  serviceTitle: z.string(),
  serviceApplicationTitle: z.string(),
});

export type EnrichedApplicationDto = z.infer<typeof EnrichedApplicationDto>;

export const ApplicationsListResponseDto = z.object({
  items: z.array(EnrichedApplicationDto),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type ApplicationsListResponseDto = z.infer<
  typeof ApplicationsListResponseDto
>;
