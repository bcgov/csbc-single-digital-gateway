import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    // Liveness: the process is up and the event loop is responsive.
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    // Readiness: add dependency indicators (DB, cache, ...) here as they are introduced.
    return this.health.check([]);
  }
}
