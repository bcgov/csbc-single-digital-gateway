import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { createDatabase, resolvePgSsl, type Database } from '@repo/database';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import {
  AUTH_USER_SYNC,
  AuthModule,
  SESSION_REGISTRY,
  type AuthModuleOptions,
} from '@repo/nestjs/auth';
import { DatabaseModule } from '@repo/nestjs/database';
import { DatabaseHealthIndicator } from '@repo/nestjs/database-health';
import { HealthModule } from '@repo/nestjs/health';
import { LoggerModule } from '@repo/nestjs/logger';
import Valkey from 'iovalkey';
import { OidcUserSyncService } from './auth/oidc-user-sync.service';
import { ValkeySessionRegistry } from './auth/valkey-session-registry';
import { validateEnv, type Env } from './config/env.schema';
import { DocumentTypesModule } from './modules/document-types/document-types.module';
import { FormsModule } from './modules/forms/forms.module';
import { ServiceAgreementsModule } from './modules/service-agreements/service-agreements.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ServicesModule } from './modules/services/services.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';

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
    // Build the Drizzle client from the validated DATABASE_URL and register it globally
    // for injection via @InjectDatabase(). The pg pool is closed on shutdown.
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createDatabase(config.get('DATABASE_URL', { infer: true }), {
          ssl: resolvePgSsl({
            mode: config.get('PGSSLMODE', { infer: true }),
            ca: config.get('DATABASE_CA_CERT', { infer: true }),
          }),
        }),
      onDestroy: (db: Database) => db.$client.end(),
    }),
    // OIDC BFF auth (global). Discovery runs against OIDC_ISSUER at boot — except under test,
    // where a stub config is injected so AppModule boots without a running Keycloak. Wave 1
    // uses the passthrough sync (no DB); Wave 3 overrides AUTH_USER_SYNC.
    AuthModule.forRootAsync({
      inject: [ConfigService],
      // Override the passthrough sync: persist users/identities and source roles from the DB.
      userSync: { provide: AUTH_USER_SYNC, useClass: OidcUserSyncService },
      // Index sessions per user (Valkey) so "logout everywhere" can revoke them all. lazyConnect
      // keeps the client from dialing Valkey at boot (e.g. under test) until first used.
      sessionRegistry: {
        provide: SESSION_REGISTRY,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>) =>
          new ValkeySessionRegistry(
            new Valkey(config.get('VALKEY_URL', { infer: true }), { lazyConnect: true }),
            config.get('SESSION_KEY_PREFIX', { infer: true }),
          ),
      },
      useFactory: (config: ConfigService<Env, true>): AuthModuleOptions => {
        const nodeEnv = config.get('NODE_ENV', { infer: true });
        const postLogoutRedirect = config.get('AUTH_POST_LOGOUT_REDIRECT', { infer: true });
        const options: AuthModuleOptions = {
          issuer: config.get('OIDC_ISSUER', { infer: true }),
          clientId: config.get('OIDC_CLIENT_ID', { infer: true }),
          clientSecret: config.get('OIDC_CLIENT_SECRET', { infer: true }),
          redirectUri: config.get('OIDC_REDIRECT_URI', { infer: true }),
          scopes: ['openid', 'profile', 'email'],
          postLoginRedirect: config.get('AUTH_POST_LOGIN_REDIRECT', { infer: true }),
          session: { secret: config.get('AUTH_SESSION_SECRET', { infer: true }) },
          // /auth is intrinsically public; health probes must be reachable unauthenticated.
          publicPaths: ['/health'],
          rpLogout: config.get('AUTH_RP_LOGOUT', { infer: true }),
          ...(postLogoutRedirect !== undefined && { postLogoutRedirect }),
          // CSRF: only allow mutating requests from these origins (defense-in-depth on SameSite=lax).
          allowedOrigins: config.get('AUTH_ALLOWED_ORIGINS', { infer: true }),
          // Refresh the access token this many seconds before expiry (lazy, on-request).
          tokenRefreshSkewSeconds: config.get('AUTH_TOKEN_REFRESH_SKEW_SECONDS', { infer: true }),
        };
        if (nodeEnv === 'test') {
          return { ...options, config: {} as unknown as NonNullable<AuthModuleOptions['config']> };
        }
        return options;
      },
    }),
    // Cross-cutting modules (health, auth, ...) are imported here and stay at the
    // unversioned root. Feature modules live under src/modules/<feature>/.
    // /health/ready reports the database via DatabaseHealthIndicator (select 1).
    HealthModule.forRoot({ readiness: [DatabaseHealthIndicator] }),
    // Feature modules (versioned under /v1).
    WorkspacesModule,
    DocumentTypesModule,
    ServicesModule,
    FormsModule,
    ServiceAgreementsModule,
    SubmissionsModule,
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
