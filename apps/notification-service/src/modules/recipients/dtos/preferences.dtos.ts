import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const channelSchema = z.enum(['in_app', 'email']);
export type Channel = z.infer<typeof channelSchema>;

/** Every channel the API composes into responses (absent preference rows read as disabled). */
export const ALL_CHANNELS: readonly Channel[] = Object.freeze(['in_app', 'email'] as const);

const channelToggleSchema = z.object({
  channel: channelSchema,
  enabled: z.boolean(),
});

export const updatePreferencesSchema = z.object({
  // absent = leave unchanged, null = clear the address, string = set it.
  email: z.email().nullable().optional(),
  // Partial update: only the channels listed are touched. Each channel at most once —
  // duplicates are a caller bug, not a last-wins merge.
  channels: z
    .array(channelToggleSchema)
    .max(ALL_CHANNELS.length)
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
