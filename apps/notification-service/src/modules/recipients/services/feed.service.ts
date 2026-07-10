import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDatabase } from '@repo/nestjs/database';
import {
  deliveries,
  notifications,
  recipients,
  type Database,
  type Delivery,
  type Notification,
} from '@repo/notification-database';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';

import type { FeedItem, FeedQuery, FeedResponse } from '../dtos/feed.dtos';
import { parseUuidParam } from '../util/user-id';

/**
 * The read side of the in-app channel. Everything is scoped `channel = 'in_app'` — email
 * deliveries never appear here. Unknown recipients read as an empty feed (consistent with
 * the preferences API: never-configured is a normal state).
 */
@Injectable()
export class FeedService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async list(userId: string, query: FeedQuery): Promise<FeedResponse> {
    const recipientId = await this.recipientIdFor(parseUuidParam(userId, 'userId'));
    if (recipientId === undefined) {
      return { items: [], total: 0, limit: query.limit, offset: query.offset };
    }
    const scope = and(eq(deliveries.recipientId, recipientId), eq(deliveries.channel, 'in_app'));
    const rows = await this.db
      .select({ delivery: deliveries, notification: notifications })
      .from(deliveries)
      .innerJoin(notifications, eq(deliveries.notificationId, notifications.id))
      .where(scope)
      .orderBy(desc(deliveries.createdAt), desc(deliveries.id))
      .limit(query.limit)
      .offset(query.offset);
    const [totals] = await this.db.select({ total: count() }).from(deliveries).where(scope);
    return {
      items: rows.map((r) => toFeedItem(r.delivery, r.notification)),
      total: totals?.total ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const recipientId = await this.recipientIdFor(parseUuidParam(userId, 'userId'));
    if (recipientId === undefined) {
      return 0;
    }
    const [row] = await this.db
      .select({ total: count() })
      .from(deliveries)
      .where(
        and(
          eq(deliveries.recipientId, recipientId),
          eq(deliveries.channel, 'in_app'),
          isNull(deliveries.readAt),
        ),
      );
    return row?.total ?? 0;
  }

  async markRead(userId: string, deliveryId: string): Promise<FeedItem> {
    const uid = parseUuidParam(userId, 'userId');
    const did = parseUuidParam(deliveryId, 'deliveryId');
    const recipientId = await this.recipientIdFor(uid);
    // 404 hides whether the delivery exists for someone else — no cross-recipient probing.
    if (recipientId === undefined) {
      throw new NotFoundException();
    }
    const owned = and(
      eq(deliveries.id, did),
      eq(deliveries.recipientId, recipientId),
      eq(deliveries.channel, 'in_app'),
    );
    // Idempotent: only unread rows are updated; an already-read row is returned unchanged.
    await this.db
      .update(deliveries)
      .set({ readAt: sql`now()` })
      .where(and(owned, isNull(deliveries.readAt)));
    const [row] = await this.db
      .select({ delivery: deliveries, notification: notifications })
      .from(deliveries)
      .innerJoin(notifications, eq(deliveries.notificationId, notifications.id))
      .where(owned)
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException();
    }
    return toFeedItem(row.delivery, row.notification);
  }

  async markAllRead(userId: string): Promise<number> {
    const recipientId = await this.recipientIdFor(parseUuidParam(userId, 'userId'));
    if (recipientId === undefined) {
      return 0;
    }
    const updated = await this.db
      .update(deliveries)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(deliveries.recipientId, recipientId),
          eq(deliveries.channel, 'in_app'),
          isNull(deliveries.readAt),
        ),
      )
      .returning({ id: deliveries.id });
    return updated.length;
  }

  private async recipientIdFor(userId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: recipients.id })
      .from(recipients)
      .where(eq(recipients.userId, userId))
      .limit(1);
    return row?.id;
  }
}

function toFeedItem(delivery: Delivery, notification: Notification): FeedItem {
  return {
    deliveryId: delivery.id,
    notificationId: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body ?? null,
    payload: notification.payload ?? null,
    createdAt: delivery.createdAt.toISOString(),
    readAt: delivery.readAt?.toISOString() ?? null,
  };
}
