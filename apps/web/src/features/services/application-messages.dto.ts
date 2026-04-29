import { z } from "zod";

export const WorkflowMessageStatusDto = z.enum([
  "active",
  "archived",
  "dismissed",
]);

export const WorkflowMessageDto = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  actorId: z.string(),
  actorType: z.string(),
  workflowInstanceId: z.string(),
  workflowId: z.string(),
  projectId: z.string(),
  status: WorkflowMessageStatusDto,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkflowMessagesResponseDto = z.object({
  items: z.array(WorkflowMessageDto),
});

export type WorkflowMessage = z.infer<typeof WorkflowMessageDto>;
export type WorkflowMessagesResponse = z.infer<
  typeof WorkflowMessagesResponseDto
>;
