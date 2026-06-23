import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // URI versioning, no global prefix: feature controllers opt into a version
  // (`@Controller({ path, version: '1' })` -> /v1/...); unversioned controllers
  // (health, auth, ...) stay at the root.
  app.enableVersioning({ type: VersioningType.URI });
  const config = app.get(ConfigService<Env, true>);
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
