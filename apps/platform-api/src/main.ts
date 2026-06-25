import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@repo/nestjs/logger';
import session from 'express-session';
import { AppModule } from './app.module';
import { buildAppSessionOptions } from './auth/session.factory';
import type { Env } from './config/env.schema';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  // Buffer bootstrap logs until pino is installed as the app logger, so ordering/format
  // is consistent from the very first line.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  // URI versioning, no global prefix: feature controllers opt into a version
  // (`@Controller({ path, version: '1' })` -> /v1/...); unversioned controllers
  // (health, auth, ...) stay at the root.
  app.enableVersioning({ type: VersioningType.URI });
  // Drain DB pools (and other onDestroy hooks) on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  const config = app.get(ConfigService<Env, true>);
  // Let the browser SPA (its own origin) make credentialed cross-origin calls to the BFF
  // (`/auth/me`, `/auth/logout`). The allowlist is the CSRF Origin allowlist — never `*`, which
  // the Fetch spec forbids alongside credentials. Empty list => CORS closed (same opt-in posture
  // as the CSRF guard).
  app.enableCors({
    origin: config.get('AUTH_ALLOWED_ORIGINS', { infer: true }),
    credentials: true,
  });
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  // BFF server session: Valkey-backed in production, in-memory otherwise. Behind a TLS proxy,
  // also `app.set('trust proxy', 1)` so `secure` cookies are honoured.
  app.use(
    session(
      buildAppSessionOptions({
        secret: config.get('AUTH_SESSION_SECRET', { infer: true }),
        secure: nodeEnv === 'production',
        useStore: nodeEnv === 'production',
        valkeyUrl: config.get('VALKEY_URL', { infer: true }),
        sessionKeyPrefix: config.get('SESSION_KEY_PREFIX', { infer: true }),
      }),
    ),
  );
  // OpenAPI docs (base + /v1), non-production only.
  setupSwagger(app, nodeEnv);
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
