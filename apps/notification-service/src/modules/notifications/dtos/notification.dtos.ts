import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const notificationChannelSchema = z.enum(['in_app', 'email']);
export const deliveryStatusSchema = z.enum(['pending', 'sent', 'failed']);

export const createNotificationSchema = z.object({
  // The producer's dedupe contract: same key → same notification, first write wins.
  idempotencyKey: z.string().min(1).max(255),
  // The shared platform users.id VALUE — opaque here (no FK, no cross-database join).
  userId: z.uuid(),
  // Producer event category, e.g. 'application.decision' (template selection later).
  type: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  body: z.string().max(10_000).optional(),
  // Structured extras (e.g. link target); stored as jsonb, never interpreted server-side.
  payload: z.record(z.string(), z.unknown()).optional(),
  // Seeds/updates the recipient profile's contact address. NEVER enables a channel.
  email: z.email().optional(),
});

export class CreateNotificationDto extends createZodDto(createNotificationSchema) {}
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const deliverySummarySchema = z.object({
  id: z.uuid(),
  channel: notificationChannelSchema,
  status: deliveryStatusSchema,
});

export const notificationResponseSchema = z.object({
  id: z.uuid(),
  idempotencyKey: z.string(),
  userId: z.uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  deliveries: z.array(deliverySummarySchema),
});

export class NotificationResponseDto extends createZodDto(notificationResponseSchema) {}
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
