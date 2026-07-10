import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDatabase } from '@repo/nestjs/database';
import type { Database } from '@repo/notification-database';
import type { Pool, PoolClient } from 'pg';

import type { Env } from '../../../config/env.schema';

/** The LISTEN channel the ingestion tx NOTIFYs on (see ingestion.service.ts). */
export const NOTIFICATION_EVENTS_CHANNEL = 'notification_events';

const RECONNECT_DELAY_MS = 5_000;

type Unsubscribe = () => void;

/**
 * Cluster-correct real-time events: the ingestion transaction `pg_notify`s on in-app delivery
 * creation (transactional — fires only on commit), this service holds ONE dedicated pg client
 * on LISTEN for the process lifetime and fans events out to in-process SSE subscribers. No
 * broker, no in-process coupling to ingestion — a NOTIFY from any pod reaches every pod.
 */
@Injectable()
export class NotificationEventsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationEventsService.name);
  private readonly subscribers = new Map<string, Set<() => void>>();
  private client: PoolClient | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private stopped = false;

  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') {
      return;
    }
    void this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
    }
    // Destroy rather than return to the pool — a client that LISTENed must not be reused.
    this.client?.release(true);
    this.client = undefined;
  }

  /** Register for "this recipient's feed changed" events. Returns the unsubscribe. */
  subscribe(userId: string, callback: () => void): Unsubscribe {
    let set = this.subscribers.get(userId);
    if (set === undefined) {
      set = new Set();
      this.subscribers.set(userId, set);
    }
    set.add(callback);
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.subscribers.delete(userId);
      }
    };
  }

  /** The LISTEN callback body — public so unit tests can drive fan-out without a live pg. */
  handleNotificationPayload(payload: string | undefined): void {
    if (payload === undefined || payload === '') {
      return;
    }
    let userId: unknown;
    try {
      userId = (JSON.parse(payload) as { userId?: unknown }).userId;
    } catch {
      this.logger.warn('discarding malformed notification event payload');
      return;
    }
    if (typeof userId !== 'string') {
      return;
    }
    const set = this.subscribers.get(userId);
    if (set === undefined) {
      return;
    }
    for (const callback of set) {
      callback();
    }
  }

  private async connect(): Promise<void> {
    if (this.stopped) {
      return;
    }
    try {
      // One dedicated connection checked out of the drizzle pool for the process lifetime.
      const client = await (this.db.$client as Pool).connect();
      this.client = client;
      client.on('notification', (message) => {
        if (message.channel === NOTIFICATION_EVENTS_CHANNEL) {
          this.handleNotificationPayload(message.payload);
        }
      });
      client.on('error', (error: Error) => {
        this.logger.warn(`LISTEN connection lost: ${error.message} — reconnecting`);
        this.client?.release(true);
        this.client = undefined;
        this.scheduleReconnect();
      });
      await client.query(`LISTEN ${NOTIFICATION_EVENTS_CHANNEL}`);
      this.logger.log(`listening on ${NOTIFICATION_EVENTS_CHANNEL}`);
    } catch (error) {
      this.logger.warn(
        `LISTEN connect failed: ${error instanceof Error ? error.message : 'unknown'} — retrying`,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== undefined) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, RECONNECT_DELAY_MS);
    this.reconnectTimer.unref();
  }
}
