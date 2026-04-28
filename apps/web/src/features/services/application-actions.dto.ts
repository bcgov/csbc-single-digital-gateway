import { z } from "zod";

export const WorkflowActionStatusDto = z.enum([
  "pending",
  "completed",
  "cancelled",
  "expired",
]);

export const WorkflowActionPriorityDto = z
  .enum(["low", "normal", "high"])
  .default("normal");

export const WorkflowActionCallbackMethodDto = z.enum(["POST", "PUT", "PATCH"]);

export const WorkflowActionDto = z.object({
  id: z.uuid(),
  actionType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  callbackUrl: z.url(),
  callbackMethod: WorkflowActionCallbackMethodDto,
  callbackPayloadSpec: z.record(z.string(), z.unknown()),
  actorId: z.string(),
  actorType: z.string(),
  workflowInstanceId: z.string(),
  workflowId: z.string(),
  projectId: z.string(),
  status: WorkflowActionStatusDto,
  priority: WorkflowActionPriorityDto,
  dueDate: z.string().nullable(),
  checkIn: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkflowActionsResponseDto = z.object({
  items: z.array(WorkflowActionDto),
  nextCursor: z.string().nullable(),
});

export type WorkflowAction = z.infer<typeof WorkflowActionDto>;
export type WorkflowActionsResponse = z.infer<
  typeof WorkflowActionsResponseDto
>;
