import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@repo/nestjs/logger';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  // Buffer bootstrap logs until pino is installed as the app logger, so ordering/format
  // is consistent from the very first line.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  // URI versioning, no global prefix: feature controllers opt into a version
  // (`@Controller({ path, version: '1' })` -> /v1/...); unversioned controllers
  // (health, ...) stay at the root.
  app.enableVersioning({ type: VersioningType.URI });
  // Drain DB pools (and other onDestroy hooks) on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  const config = app.get(ConfigService<Env, true>);
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  // No sessions/cookies and no browser callers: this service is server-to-server only, so
  // there is no express-session, no CORS, and no `trust proxy` (that exists solely to keep
  // Secure session cookies alive behind the edge proxy in the BFF apps).
  // OpenAPI docs (base + /v1), non-production only.
  setupSwagger(app, nodeEnv);
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
