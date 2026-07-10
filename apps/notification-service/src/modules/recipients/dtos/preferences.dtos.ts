import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const channelSchema = z.enum(['in_app', 'email']);
export type Channel = z.infer<typeof channelSchema>;

/** Every channel the API composes into responses. */
export const ALL_CHANNELS: readonly Channel[] = Object.freeze(['in_app', 'email'] as const);

/**
 * The channels a user may toggle (feature 128): in_app is MANDATORY — always delivered, always
 * composed as enabled — and is rejected on the write path. Future channels (sms/push) join
 * THIS set unless explicitly decided otherwise.
 */
export const TOGGLABLE_CHANNELS = ['email'] as const;
export const togglableChannelSchema = z.enum(TOGGLABLE_CHANNELS);

const channelToggleSchema = z.object({
  channel: channelSchema,
  enabled: z.boolean(),
});

const togglableToggleSchema = z.object({
  channel: togglableChannelSchema,
  enabled: z.boolean(),
});

export const updatePreferencesSchema = z.object({
  // absent = leave unchanged, null = clear the address, string = set it.
  email: z.email().nullable().optional(),
  // Partial update over the TOGGLABLE channels only (in_app entries are a 400 — mandatory
  // channel). Each channel at most once — duplicates are a caller bug, not a last-wins merge.
  channels: z
    .array(togglableToggleSchema)
    .max(TOGGLABLE_CHANNELS.length + 1)
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
  channels: z.array(channelToggleSchema),
});

export class PreferencesResponseDto extends createZodDto(preferencesResponseSchema) {}
export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;
