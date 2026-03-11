import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { type Database } from '@repo/db';
import { PublicRoute } from 'src/modules/auth/decorators/public-route.decorator';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

@Controller({
  path: 'health',
})
export class HealthController {
  constructor(
    private readonly configService: ConfigService<AppConfigDto, true>,
    @InjectDb()
    private readonly db: Database,
    private readonly drizzle: DrizzleHealthIndicator,
    private readonly healthCheckService: HealthCheckService,
    private readonly http: HttpHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  @PublicRoute()
  checkLiveliness() {
    return this.healthCheckService.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @PublicRoute()
  checkReadiness() {
    return this.healthCheckService.check([
      () => this.drizzle.isHealthy('database', this.db),
      () =>
        this.http.pingCheck(
          'identity_provider',
          `${this.configService.get('OIDC_ISSUER')}/.well-known/openid-configuration`,
        ),
    ]);
  }
}
