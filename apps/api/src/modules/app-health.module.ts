import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigDto, AppConfigSchema } from 'src/common/dtos/app-config.dto';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

/**
 * AppHealthModule is a minimal module that only serves health check endpoints.
 * It runs on a separate port (9000) to keep health endpoints internal and not
 * exposed via the public Route.
 *
 * This module includes:
 * - Configuration management (ConfigModule)
 * - Logging (LoggerModule)
 * - Database connectivity (DatabaseModule) - for database health checks
 * - Health checks (HealthModule)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config: Record<string, any>) => AppConfigSchema.parse(config),
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService<AppConfigDto, true>) => {
        return {
          pinoHttp: {
            level:
              configService.get('NODE_ENV') !== 'production' ? 'debug' : 'info',
            transport:
              configService.get('NODE_ENV') !== 'production'
                ? { target: 'pino-pretty' }
                : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppHealthModule {}
