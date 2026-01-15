import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { DefaultSchema } from 'src/database/default';
import { PublicRoute } from 'src/modules/auth/decorators/public-route.decorator';
import { InjectDefaultDb } from 'src/modules/database/decorators/inject-default-database.decorator';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

@Controller({
  path: 'health',
})
export class HealthController {
  constructor(
    private readonly configService: ConfigService<AppConfigDto, true>,
    @InjectDefaultDb()
    private readonly defaultDb: NodePgDatabase<DefaultSchema>,
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
      () => this.drizzle.isHealthy('default_database', this.defaultDb),
      () =>
        this.http.pingCheck(
          'identity_provider',
          this.configService.get('OIDC_JWKS_URI'),
        ),
    ]);
  }
}
