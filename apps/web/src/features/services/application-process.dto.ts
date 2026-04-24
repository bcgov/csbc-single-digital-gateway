import { z } from "zod";

export const ProcessStepDto = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export type ProcessStepDto = z.infer<typeof ProcessStepDto>;

export const ApplicationProcessResponseDto = z.object({
  applicationId: z.uuid(),
  workflowId: z.string(),
  name: z.string(),
  steps: z.array(ProcessStepDto),
});

export type ApplicationProcessResponseDto = z.infer<
  typeof ApplicationProcessResponseDto
>;
