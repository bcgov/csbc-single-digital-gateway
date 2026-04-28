import { z } from 'zod';

export const WorkflowMessageStatusSchema = z.enum([
  'active',
  'archived',
  'dismissed',
]);

export const WorkflowMessageSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  actorId: z.string(),
  actorType: z.string(),
  workflowInstanceId: z.string(),
  workflowId: z.string(),
  projectId: z.string(),
  status: WorkflowMessageStatusSchema,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkflowMessagesUpstreamSchema = z.array(WorkflowMessageSchema);

export const WorkflowMessagesResponseSchema = z.object({
  items: z.array(WorkflowMessageSchema),
});

export type WorkflowMessage = z.infer<typeof WorkflowMessageSchema>;
export type WorkflowMessagesResponse = z.infer<
  typeof WorkflowMessagesResponseSchema
>;
