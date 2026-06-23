/**
 * DI token holding the resolved readiness indicator instances that the health controller
 * runs for `GET /health/ready`. Populated by {@link HealthModule.forRoot}; absent (and
 * defaulted to `[]`) when `HealthModule` is imported statically.
 */
export const READINESS_INDICATORS = Symbol('READINESS_INDICATORS');
