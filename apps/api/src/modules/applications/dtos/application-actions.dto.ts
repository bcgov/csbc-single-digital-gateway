import { z } from 'zod';

export const WorkflowActionStatusSchema = z.enum([
  'pending',
  'completed',
  'cancelled',
  'expired',
]);

export const WorkflowActionPrioritySchema = z
  .enum(['low', 'normal', 'high'])
  .default('normal');

export const WorkflowActionCallbackMethodSchema = z.enum([
  'POST',
  'PUT',
  'PATCH',
]);

export const WorkflowActionSchema = z.object({
  id: z.string().uuid(),
  actionType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  callbackUrl: z.string().url(),
  callbackMethod: WorkflowActionCallbackMethodSchema,
  callbackPayloadSpec: z.record(z.string(), z.unknown()),
  actorId: z.string(),
  actorType: z.string(),
  workflowInstanceId: z.string(),
  workflowId: z.string(),
  projectId: z.string(),
  status: WorkflowActionStatusSchema,
  priority: WorkflowActionPrioritySchema,
  dueDate: z.string().nullable(),
  checkIn: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkflowActionsResponseSchema = z.object({
  items: z.array(WorkflowActionSchema),
  nextCursor: z.string().nullable(),
});

export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;
export type WorkflowActionsResponse = z.infer<
  typeof WorkflowActionsResponseSchema
>;
