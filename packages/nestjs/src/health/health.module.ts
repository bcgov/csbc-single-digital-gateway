import { Module } from '@nestjs/common';
import type { DynamicModule, Type } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { READINESS_INDICATORS } from './health.constants';
import { HealthController } from './health.controller';
import type { ReadinessIndicator } from './health.types';

export interface HealthModuleOptions {
  /** Indicator classes run for `GET /health/ready`. Each is registered as a provider. */
  readiness?: Type<ReadinessIndicator>[];
}

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {
  /**
   * Register consumer readiness indicators. The indicator classes become providers (so
   * their dependencies are injected) and their instances are aggregated under
   * {@link READINESS_INDICATORS}. Importing `HealthModule` statically (no `forRoot`) leaves
   * readiness empty — `/health/ready` then reports `ok`.
   */
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    const indicators = options.readiness ?? [];
    return {
      module: HealthModule,
      providers: [
        ...indicators,
        {
          provide: READINESS_INDICATORS,
          useFactory: (...resolved: ReadinessIndicator[]) => resolved,
          inject: indicators,
        },
      ],
    };
  }
}
