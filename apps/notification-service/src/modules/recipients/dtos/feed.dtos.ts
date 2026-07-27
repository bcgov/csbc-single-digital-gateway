import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export class FeedQueryDto extends createZodDto(feedQuerySchema) {}
export type FeedQuery = z.infer<typeof feedQuerySchema>;

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
