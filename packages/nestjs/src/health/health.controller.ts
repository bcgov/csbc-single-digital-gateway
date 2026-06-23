import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';

import { READINESS_INDICATORS } from './health.constants';
import type { ReadinessIndicator } from './health.types';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    // Empty when HealthModule is imported statically; populated by HealthModule.forRoot.
    @Optional()
    @Inject(READINESS_INDICATORS)
    private readonly readiness: readonly ReadinessIndicator[] = [],
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    // Liveness: the process is up and the event loop is responsive — never pings deps.
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    // Readiness: run every registered dependency indicator (DB, cache, ...).
    return this.health.check(this.readiness.map((indicator) => () => indicator.readiness()));
  }
}
