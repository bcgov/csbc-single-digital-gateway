import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Zod mirrors of the notification-service contracts (features 104/105) — the BFF validates
// at BOTH boundaries: request bodies before forwarding, upstream responses before serializing.

export const channelSchema = z.enum(['in_app', 'email']);

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export class FeedQueryDto extends createZodDto(feedQuerySchema) {}

export const feedItemSchema = z.object({
  deliveryId: z.uuid(),
  notificationId: z.uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export class FeedItemDto extends createZodDto(feedItemSchema) {}
export type FeedItem = z.infer<typeof feedItemSchema>;

export const feedResponseSchema = z.object({
  items: z.array(feedItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export class FeedResponseDto extends createZodDto(feedResponseSchema) {}
export type FeedResponse = z.infer<typeof feedResponseSchema>;

export const unreadCountSchema = z.object({ count: z.number().int().nonnegative() });
export class UnreadCountDto extends createZodDto(unreadCountSchema) {}
export type UnreadCount = z.infer<typeof unreadCountSchema>;

export const readAllResponseSchema = z.object({ updated: z.number().int().nonnegative() });
export class ReadAllResponseDto extends createZodDto(readAllResponseSchema) {}
export type ReadAllResponse = z.infer<typeof readAllResponseSchema>;

export const updatePreferencesSchema = z.object({
  email: z.email().nullable().optional(),
  channels: z
    .array(z.object({ channel: channelSchema, enabled: z.boolean() }))
    .max(2)
    .refine(
      (entries) => new Set(entries.map((e) => e.channel)).size === entries.length,
      'duplicate channel entries',
    )
    .optional(),
});
export class UpdatePreferencesDto extends createZodDto(updatePreferencesSchema) {}
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const preferencesResponseSchema = z.object({
  userId: z.uuid(),
  email: z.string().nullable(),
  channels: z.array(z.object({ channel: channelSchema, enabled: z.boolean() })),
});
export class PreferencesResponseDto extends createZodDto(preferencesResponseSchema) {}
export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;
