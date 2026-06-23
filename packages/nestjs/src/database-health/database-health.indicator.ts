import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';

import { InjectDatabase } from '../database/database.decorators';
import type { ReadinessIndicator } from '../health/health.types';

/**
 * The minimal client shape this indicator needs: a `$client` exposing `query(sql)`. A
 * `drizzle-orm/node-postgres` `Database` satisfies it (its `$client` is the `pg.Pool`).
 * Typed structurally so `@repo/nestjs` imports neither `drizzle-orm` nor `pg`.
 */
export interface HealthCheckableClient {
  $client: { query(sql: string): Promise<unknown> };
}

/**
 * Terminus readiness indicator that reports the database `up` when a trivial `select 1`
 * succeeds over the injected client, `down` otherwise. Register it via
 * `HealthModule.forRoot({ readiness: [DatabaseHealthIndicator] })`; it injects the client
 * provided by `DatabaseModule` (`@InjectDatabase()`).
 */
@Injectable()
export class DatabaseHealthIndicator implements ReadinessIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    private readonly healthIndicator: HealthIndicatorService,
    @InjectDatabase() private readonly client: HealthCheckableClient,
  ) {}

  async readiness(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicator.check('database');
    try {
      await this.client.$client.query('select 1');
      return indicator.up();
    } catch (error) {
      // Log the real reason server-side; return a generic message so the public health
      // payload never leaks host/port/user/credentials from the driver error.
      this.logger.warn(
        `database readiness check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return indicator.down({ message: 'database unreachable' });
    }
  }
}
