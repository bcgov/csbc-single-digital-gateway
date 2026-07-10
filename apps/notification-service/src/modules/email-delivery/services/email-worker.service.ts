import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderNotificationEmail } from '@repo/emails';
import { InjectDatabase } from '@repo/nestjs/database';
import {
  deliveries,
  notifications,
  recipients,
  type Database,
  type Delivery,
  type Notification,
} from '@repo/notification-database';
import { and, asc, eq, lte, sql } from 'drizzle-orm';

import type { Env } from '../../../config/env.schema';
import { backoffMs, DEFAULT_BACKOFF_BASE_MS } from '../backoff';
import { EMAIL_SENDER, type EmailSender } from './mailer';

interface DueRow {
  delivery: Delivery;
  notification: Notification;
  email: string | null;
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Drains the email outbox. A plain lifecycle provider (setInterval — no @nestjs/schedule for
 * one loop); ticks never overlap in-process, and the claim query uses FOR UPDATE SKIP LOCKED
 * so concurrent pods never double-send. SMTP I/O runs inside the claim transaction (locks
 * held for the send) — fine at this volume with small batches; a two-phase `sending` status
 * is future hardening if throughput demands it.
 */
@Injectable()
export class EmailWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EmailWorkerService.name);
  private timer: NodeJS.Timeout | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(
    @InjectDatabase() private readonly db: Database,
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap(): void {
    if (
      !this.config.get('EMAIL_WORKER_ENABLED', { infer: true }) ||
      this.config.get('NODE_ENV', { infer: true }) === 'test'
    ) {
      return;
    }
    const intervalMs = this.config.get('EMAIL_WORKER_INTERVAL_MS', { infer: true });
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.timer.unref();
    this.logger.log(`email worker started (every ${intervalMs}ms)`);
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
    this.inFlight = this.processDueDeliveries()
      .then((claimed) => {
        if (claimed > 0) {
          this.logger.log(`processed ${claimed} email deliver${claimed === 1 ? 'y' : 'ies'}`);
        }
      })
      .catch((error: unknown) => {
        this.logger.error(
          `email worker tick failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    await this.inFlight;
  }

  /** Claim due pending email deliveries (SKIP LOCKED) and handle each. Returns the claim count. */
  async processDueDeliveries(): Promise<number> {
    const batchSize = this.config.get('EMAIL_WORKER_BATCH_SIZE', { infer: true });
    const maxAttempts = this.config.get('EMAIL_MAX_ATTEMPTS', { infer: true });
    return this.db.transaction(async (tx) => {
      const due: DueRow[] = await tx
        .select({ delivery: deliveries, notification: notifications, email: recipients.email })
        .from(deliveries)
        .innerJoin(notifications, eq(deliveries.notificationId, notifications.id))
        .innerJoin(recipients, eq(deliveries.recipientId, recipients.id))
        .where(
          and(
            eq(deliveries.channel, 'email'),
            eq(deliveries.status, 'pending'),
            lte(deliveries.nextAttemptAt, sql`now()`),
          ),
        )
        .orderBy(asc(deliveries.nextAttemptAt))
        .limit(batchSize)
        .for('update', { of: deliveries, skipLocked: true });

      for (const row of due) {
        // eslint-disable-next-line no-await-in-loop -- sequential sends share one tx connection
        await this.handleOne(tx, row, maxAttempts);
      }
      return due.length;
    });
  }

  private async handleOne(tx: Tx, row: DueRow, maxAttempts: number): Promise<void> {
    const { delivery, notification, email } = row;
    // Enabled-but-addressless: terminal immediately — retrying can't conjure an address.
    if (email === null || email === '') {
      await tx
        .update(deliveries)
        .set({ status: 'failed', lastError: 'recipient has no email address' })
        .where(eq(deliveries.id, delivery.id));
      this.logger.warn(`delivery ${delivery.id} failed: recipient has no email address`);
      return;
    }

    try {
      const rendered = await renderNotificationEmail({
        title: notification.title,
        body: notification.body ?? undefined,
      });
      await this.sender.send({ to: email, ...rendered });
      await tx
        .update(deliveries)
        .set({ status: 'sent', sentAt: sql`now()`, lastError: null })
        .where(eq(deliveries.id, delivery.id));
    } catch (error) {
      const attempts = delivery.attempts + 1;
      const terminal = attempts >= maxAttempts;
      const lastError = error instanceof Error ? error.message : 'unknown send error';
      await tx
        .update(deliveries)
        .set({
          attempts,
          lastError,
          ...(terminal
            ? { status: 'failed' as const }
            : {
                nextAttemptAt: new Date(Date.now() + backoffMs(attempts, DEFAULT_BACKOFF_BASE_MS)),
              }),
        })
        .where(eq(deliveries.id, delivery.id));
      this.logger.warn(
        `delivery ${delivery.id} attempt ${attempts}/${maxAttempts} failed${terminal ? ' (terminal)' : ''}: ${lastError}`,
      );
    }
  }
}
