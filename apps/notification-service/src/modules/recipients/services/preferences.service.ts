import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectDatabase } from '@repo/nestjs/database';
import { channelPreferences, recipients, type Database } from '@repo/notification-database';
import { and, eq } from 'drizzle-orm';

import {
  ALL_CHANNELS,
  type PreferencesResponse,
  type UpdatePreferencesInput,
} from '../dtos/preferences.dtos';
import { emailContactMissing } from '../util/email-contact';
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

      // Enforce (on the MERGED state): email notifications cannot be enabled without a contact
      // email. Reads the current email-channel pref so a partial toggle-only update is validated
      // against the stored address, and vice versa. Throwing here rolls back before any write.
      let emailEnabled = false;
      if (existing !== undefined) {
        const [pref] = await tx
          .select({ enabled: channelPreferences.enabled })
          .from(channelPreferences)
          .where(
            and(
              eq(channelPreferences.recipientId, existing.id),
              eq(channelPreferences.channel, 'email'),
            ),
          )
          .limit(1);
        emailEnabled = pref?.enabled ?? false;
      }
      if (emailContactMissing(input, { email: existing?.email ?? null, emailEnabled })) {
        throw new UnprocessableEntityException(
          'A contact email is required when email notifications are enabled',
        );
      }

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
  // in_app is mandatory (feature 128) — always composed as enabled.
  return { channel, enabled: channel === 'in_app' };
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
      // in_app is mandatory: always true regardless of any historical stored row.
      enabled: channel === 'in_app' ? true : (byChannel.get(channel) ?? false),
    })),
  };
}
