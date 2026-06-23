import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * A readiness check the health controller runs for `GET /health/ready`. Implementations
 * return a Terminus result (`up`/`down`); they should resolve — never throw — so one failing
 * dependency reports `down` rather than crashing the whole probe.
 */
export interface ReadinessIndicator {
  readiness(): Promise<HealthIndicatorResult>;
}
