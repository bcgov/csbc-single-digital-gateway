import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { DatabaseModule } from '@repo/nestjs/database';
import { DatabaseHealthIndicator } from '@repo/nestjs/database-health';
import { HealthModule } from '@repo/nestjs/health';
import { LoggerModule } from '@repo/nestjs/logger';
import { createDatabase, resolvePgSsl, type Database } from '@repo/notification-database';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { validateEnv, type Env } from './config/env.schema';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  imports: [
    // Validate the environment at boot (zod); expose typed config globally.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Structured pino logging (global). pretty in development; silent in tests so the suite
    // stays quiet and the pino-pretty worker thread never starts.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const nodeEnv = config.get('NODE_ENV', { infer: true });
        return {
          level: nodeEnv === 'test' ? 'silent' : config.get('LOG_LEVEL', { infer: true }),
          pretty: nodeEnv === 'development',
        };
      },
    }),
    // Build the Drizzle client from the validated NOTIFICATION_DATABASE_URL and register it
    // globally for injection via @InjectDatabase(). The pg pool is closed on shutdown.
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createDatabase(config.get('NOTIFICATION_DATABASE_URL', { infer: true }), {
          ssl: resolvePgSsl({
            mode: config.get('PGSSLMODE', { infer: true }),
            ca: config.get('NOTIFICATION_DATABASE_CA_CERT', { infer: true }),
          }),
        }),
      onDestroy: (db: Database) => db.$client.end(),
    }),
    // Cross-cutting modules stay at the unversioned root. Feature modules (Wave 2+) live
    // under src/modules/<feature>/ — the FIRST one MUST register the client-credentials JWT
    // guard (no route may expose ingestion unauthenticated).
    // /health/ready reports the database via DatabaseHealthIndicator (select 1).
    HealthModule.forRoot({ readiness: [DatabaseHealthIndicator] }),
  ],
  // Global nestjs-zod wiring: validate requests (createZodDto schemas), serialize responses
  // (@ZodSerializerDto), and log response-serialization failures before delegating.
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
