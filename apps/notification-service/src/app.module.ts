import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { DatabaseModule } from '@repo/nestjs/database';
import { DatabaseHealthIndicator } from '@repo/nestjs/database-health';
import { HealthModule } from '@repo/nestjs/health';
import { LoggerModule } from '@repo/nestjs/logger';
import { M2mAuthModule, type M2mAuthModuleOptions } from '@repo/nestjs/m2m-auth';
import { createDatabase, resolvePgSsl, type Database } from '@repo/notification-database';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { validateEnv, type Env } from './config/env.schema';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { EmailDeliveryModule } from './modules/email-delivery/email-delivery.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecipientsModule } from './modules/recipients/recipients.module';

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
    // m2m resource-server auth (global guard): every route requires a client-credentials
    // bearer JWT from the sdg realm carrying the notification-service audience — except
    // /health (publicPaths) and non-prod swagger (mounted outside the guard chain). Under
    // test a stub verifier is injected (accepts the literal 'test-token') so the suite
    // runs without Keycloak; the live JWKS round-trip is verified in integration.
    M2mAuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): M2mAuthModuleOptions => {
        const options: M2mAuthModuleOptions = {
          issuer: config.get('OIDC_ISSUER', { infer: true }),
          audience: config.get('M2M_AUDIENCE', { infer: true }),
          publicPaths: ['/health'],
        };
        if (config.get('NODE_ENV', { infer: true }) === 'test') {
          return {
            ...options,
            verifier: {
              verify: (token: string) =>
                token === 'test-token'
                  ? Promise.resolve({
                      clientId: 'test-client',
                      subject: 'test-subject',
                      claims: {},
                    })
                  : Promise.reject(new Error('invalid test token')),
            },
          };
        }
        return options;
      },
    }),
    // Cross-cutting modules stay at the unversioned root. Feature modules live under
    // src/modules/<feature>/ and are protected by the m2m guard by default.
    // /health/ready reports the database via DatabaseHealthIndicator (select 1).
    HealthModule.forRoot({ readiness: [DatabaseHealthIndicator] }),
    // Feature modules (all protected by the m2m guard).
    NotificationsModule,
    RecipientsModule,
    // Background email outbox drain (no routes; inert under NODE_ENV=test).
    EmailDeliveryModule,
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
