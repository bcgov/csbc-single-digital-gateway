import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ApplicationProcessParamSchema = z.object({
  serviceId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export class ApplicationProcessParamDto extends createZodDto(
  ApplicationProcessParamSchema,
) {}

export const ApplicationProcessQuerySchema = z.object({
  applicationId: z.string().uuid(),
  locale: z.string().min(1).default('en'),
});

export class ApplicationProcessQueryDto extends createZodDto(
  ApplicationProcessQuerySchema,
) {}

export const ProcessStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export type ProcessStep = z.infer<typeof ProcessStepSchema>;

export const ApplicationProcessResponseSchema = z.object({
  applicationId: z.string().uuid(),
  workflowId: z.string(),
  name: z.string(),
  steps: z.array(ProcessStepSchema),
});

export type ApplicationProcessResponse = z.infer<
  typeof ApplicationProcessResponseSchema
>;
