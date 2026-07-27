import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { notificationOutbox, type Database, type NotificationOutbox } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, lte, sql } from 'drizzle-orm';

import type { Env } from '../config/env.schema';
import { backoffMs, DEFAULT_BACKOFF_BASE_MS } from './backoff';
import { M2mTokenClient } from './m2m-token.client';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Drains the notification_outbox to the notification-service ingestion API. Byte-identical
 * across the BFFs (parameterized via env, each app using its OWN m2m client) — both relays
 * may run concurrently: FOR UPDATE SKIP LOCKED means a row is only ever claimed once.
 * At-least-once with end-to-end dedupe: 200 (ingestion replay) and 201 are both success, so
 * a crash between POST and marking delivered self-heals on the retry.
 */
@Injectable()
export class OutboxRelayService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly tokenClient: M2mTokenClient;
  private timer: NodeJS.Timeout | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.tokenClient = new M2mTokenClient({
      issuer: this.config.get('NOTIFICATIONS_M2M_ISSUER', { infer: true }),
      clientId: this.config.get('NOTIFICATIONS_M2M_CLIENT_ID', { infer: true }),
      clientSecret: this.config.get('NOTIFICATIONS_M2M_CLIENT_SECRET', { infer: true }),
    });
  }

  onApplicationBootstrap(): void {
    if (
      !this.config.get('OUTBOX_RELAY_ENABLED', { infer: true }) ||
      this.config.get('NODE_ENV', { infer: true }) === 'test'
    ) {
      return;
    }
    const intervalMs = this.config.get('OUTBOX_RELAY_INTERVAL_MS', { infer: true });
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.timer.unref();
    this.logger.log(`outbox relay started (every ${intervalMs}ms)`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
    }
    await this.inFlight;
  }

  /** One poll cycle; skipped while a previous cycle is still running. */
  async tick(): Promise<void> {
    if (this.inFlight !== undefined) {
      return;
    }
    this.inFlight = this.processDueRows()
      .then((claimed) => {
        if (claimed > 0) {
          this.logger.log(`relayed ${claimed} outbox row${claimed === 1 ? '' : 's'}`);
        }
      })
      .catch((error: unknown) => {
        this.logger.error(
          `outbox relay tick failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    await this.inFlight;
  }

  /** Claim due pending outbox rows (SKIP LOCKED) and deliver each. Returns the claim count. */
  async processDueRows(): Promise<number> {
    const batchSize = this.config.get('OUTBOX_RELAY_BATCH_SIZE', { infer: true });
    const maxAttempts = this.config.get('OUTBOX_RELAY_MAX_ATTEMPTS', { infer: true });
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(notificationOutbox)
        .where(
          and(
            eq(notificationOutbox.status, 'pending'),
            lte(notificationOutbox.nextAttemptAt, sql`now()`),
          ),
        )
        .orderBy(asc(notificationOutbox.nextAttemptAt))
        .limit(batchSize)
        .for('update', { skipLocked: true });
      if (due.length === 0) {
        return 0;
      }
      // One token per tick: if the IdP is down the whole tick fails and every row stays
      // untouched (retried next tick) instead of burning per-row attempts.
      const token = await this.tokenClient.getToken();
      for (const row of due) {
        // eslint-disable-next-line no-await-in-loop -- sequential deliveries share one tx connection
        await this.deliverOne(tx, row, token, maxAttempts);
      }
      return due.length;
    });
  }

  private async deliverOne(
    tx: Tx,
    row: NotificationOutbox,
    token: string,
    maxAttempts: number,
  ): Promise<void> {
    try {
      const base = this.config.get('NOTIFICATION_SERVICE_URL', { infer: true });
      const response = await fetch(new URL('/v1/notifications', base), {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: row.idempotencyKey,
          userId: row.userId,
          type: row.type,
          title: row.title,
          ...(row.body !== null && { body: row.body }),
          ...(row.payload !== null && { payload: row.payload }),
          ...(row.email !== null && { email: row.email }),
        }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          // Token revoked/rotated mid-life: re-authenticate next tick, don't retry blindly.
          this.tokenClient.invalidate();
        }
        throw new Error(`ingestion responded ${response.status}`);
      }
      await tx
        .update(notificationOutbox)
        .set({ status: 'delivered', deliveredAt: sql`now()`, lastError: null })
        .where(eq(notificationOutbox.id, row.id));
    } catch (error) {
      const attempts = row.attempts + 1;
      const terminal = attempts >= maxAttempts;
      const lastError = error instanceof Error ? error.message : 'unknown relay error';
      await tx
        .update(notificationOutbox)
        .set({
          attempts,
          lastError,
          ...(terminal
            ? { status: 'failed' as const }
            : {
                nextAttemptAt: new Date(Date.now() + backoffMs(attempts, DEFAULT_BACKOFF_BASE_MS)),
              }),
        })
        .where(eq(notificationOutbox.id, row.id));
      this.logger.warn(
        `outbox row ${row.id} attempt ${attempts}/${maxAttempts} failed${terminal ? ' (terminal)' : ''}: ${lastError}`,
      );
    }
  }
}
