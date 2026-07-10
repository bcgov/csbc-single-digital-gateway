import { Injectable } from '@nestjs/common';
import { InjectDatabase } from '@repo/nestjs/database';
import { channelPreferences, recipients, type Database } from '@repo/notification-database';
import { eq } from 'drizzle-orm';

import {
  ALL_CHANNELS,
  type PreferencesResponse,
  type UpdatePreferencesInput,
} from '../dtos/preferences.dtos';
import { parseUuidParam } from '../util/user-id';

/**
 * Recipient profile + channel toggles. The trust model is the m2m token — the calling BFF
 * passes ITS authenticated user's id; this service never authenticates end users. An unknown
 * recipient is a normal state (never configured), so GET returns defaults, not 404.
 */
@Injectable()
export class PreferencesService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async get(userId: string): Promise<PreferencesResponse> {
    const id = parseUuidParam(userId, 'userId');
    const [recipient] = await this.db
      .select()
      .from(recipients)
      .where(eq(recipients.userId, id))
      .limit(1);
    if (recipient === undefined) {
      return { userId: id, email: null, channels: ALL_CHANNELS.map(defaultToggle) };
    }
    const rows = await this.db
      .select()
      .from(channelPreferences)
      .where(eq(channelPreferences.recipientId, recipient.id));
    return compose(id, recipient.email, new Map(rows.map((r) => [r.channel, r.enabled])));
  }

  async update(userId: string, input: UpdatePreferencesInput): Promise<PreferencesResponse> {
    const id = parseUuidParam(userId, 'userId');
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(recipients)
        .where(eq(recipients.userId, id))
        .limit(1);
      let recipientId: string;
      if (existing === undefined) {
        const [created] = await tx
          .insert(recipients)
          .values({ userId: id, email: input.email ?? null })
          .onConflictDoNothing({ target: recipients.userId })
          .returning();
        if (created === undefined) {
          throw new Error('preferences: recipient upsert race lost and no row found');
        }
        recipientId = created.id;
      } else {
        recipientId = existing.id;
        // undefined = unchanged; null = deliberate clear; string = set. (Ingestion's seed
        // path never clears — this is the user's edit surface, so null is honoured.)
        if (input.email !== undefined) {
          await tx
            .update(recipients)
            .set({ email: input.email })
            .where(eq(recipients.id, recipientId));
        }
      }

      for (const toggle of input.channels ?? []) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
        await tx
          .insert(channelPreferences)
          .values({ recipientId, channel: toggle.channel, enabled: toggle.enabled })
          .onConflictDoUpdate({
            target: [channelPreferences.recipientId, channelPreferences.channel],
            set: { enabled: toggle.enabled },
          });
      }
    });
    return this.get(id);
  }
}

function defaultToggle(channel: (typeof ALL_CHANNELS)[number]): {
  channel: (typeof ALL_CHANNELS)[number];
  enabled: boolean;
} {
  return { channel, enabled: false };
}

function compose(
  userId: string,
  email: string | null,
  byChannel: Map<string, boolean>,
): PreferencesResponse {
  return {
    userId,
    email,
    channels: ALL_CHANNELS.map((channel) => ({
      channel,
      enabled: byChannel.get(channel) ?? false,
    })),
  };
}
