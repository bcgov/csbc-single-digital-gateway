import { Injectable } from '@nestjs/common';
import { InjectDatabase } from '@repo/nestjs/database';
import {
  channelPreferences,
  deliveries,
  notifications,
  recipients,
  type Database,
  type Delivery,
  type Notification,
} from '@repo/notification-database';
import { and, eq, sql } from 'drizzle-orm';

import type { CreateNotificationInput, NotificationResponse } from '../dtos/notification.dtos';

export interface IngestResult {
  notification: NotificationResponse;
  /** false = idempotent replay (the key already existed; no rows were written). */
  created: boolean;
}

/**
 * Ingestion + fan-out. The `notifications` table is the idempotent inbox (unique
 * idempotency_key); `deliveries` is the per-channel outbox written in the SAME transaction.
 * Fan-out reads only local data (profile + preferences) — never `@repo/database`.
 */
@Injectable()
export class IngestionService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async ingest(input: CreateNotificationInput): Promise<IngestResult> {
    // Fast path: a replayed key returns the ORIGINAL notification, no writes (first write wins).
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing !== undefined) {
      return { notification: existing, created: false };
    }

    const result = await this.db.transaction(async (tx) => {
      // Lazily create the recipient profile. A provided email updates the address; an absent
      // one never clears it (excluded.email is NULL → COALESCE keeps the current value).
      const [recipient] = await tx
        .insert(recipients)
        .values({ userId: input.userId, email: input.email ?? null })
        .onConflictDoUpdate({
          target: recipients.userId,
          set: { email: sql`coalesce(excluded.email, ${recipients.email})` },
        })
        .returning();
      if (recipient === undefined) {
        throw new Error('ingest: recipient upsert returned no row');
      }

      const [notification] = await tx
        .insert(notifications)
        .values({
          idempotencyKey: input.idempotencyKey,
          recipientId: recipient.id,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          payload: input.payload ?? null,
        })
        .onConflictDoNothing({ target: notifications.idempotencyKey })
        .returning();
      // A concurrent duplicate won the race between the fast path and this insert.
      if (notification === undefined) {
        return undefined;
      }

      const enabled = await tx
        .select()
        .from(channelPreferences)
        .where(
          and(
            eq(channelPreferences.recipientId, recipient.id),
            eq(channelPreferences.enabled, true),
          ),
        );

      const deliveryRows: Delivery[] = [];
      for (const pref of enabled) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
        const [row] = await tx
          .insert(deliveries)
          .values({
            notificationId: notification.id,
            recipientId: recipient.id,
            channel: pref.channel,
            // An in-app delivery row IS the feed item — born sent. Email waits for the worker.
            ...(pref.channel === 'in_app' ? { status: 'sent' as const, sentAt: new Date() } : {}),
          })
          .returning();
        if (row !== undefined) {
          deliveryRows.push(row);
          if (pref.channel === 'in_app') {
            // Transactional real-time signal (feature 121): fires only on commit; reaches the
            // LISTEN client on EVERY pod, so SSE stays correct beyond a single instance.
            // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
            await tx.execute(
              sql`SELECT pg_notify('notification_events', ${JSON.stringify({ userId: input.userId })})`,
            );
          }
        }
      }

      return { notification, userId: recipient.userId, deliveryRows };
    });

    if (result === undefined) {
      const replay = await this.findByIdempotencyKey(input.idempotencyKey);
      if (replay === undefined) {
        throw new Error('ingest: idempotency conflict but the existing notification was not found');
      }
      return { notification: replay, created: false };
    }
    return {
      notification: toResponse(result.notification, result.userId, result.deliveryRows),
      created: true,
    };
  }

  private async findByIdempotencyKey(key: string): Promise<NotificationResponse | undefined> {
    const [found] = await this.db
      .select({ notification: notifications, userId: recipients.userId })
      .from(notifications)
      .innerJoin(recipients, eq(notifications.recipientId, recipients.id))
      .where(eq(notifications.idempotencyKey, key))
      .limit(1);
    if (found === undefined) {
      return undefined;
    }
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.notificationId, found.notification.id));
    return toResponse(found.notification, found.userId, rows);
  }
}

function toResponse(n: Notification, userId: string, rows: Delivery[]): NotificationResponse {
  return {
    id: n.id,
    idempotencyKey: n.idempotencyKey,
    userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    payload: n.payload ?? null,
    createdAt: n.createdAt.toISOString(),
    deliveries: rows.map((d) => ({ id: d.id, channel: d.channel, status: d.status })),
  };
}
