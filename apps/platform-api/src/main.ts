import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // URI versioning, no global prefix: feature controllers opt into a version
  // (`@Controller({ path, version: '1' })` -> /v1/...); unversioned controllers
  // (health, auth, ...) stay at the root.
  app.enableVersioning({ type: VersioningType.URI });
  await app.listen(process.env.PORT ?? 4001);
}

void bootstrap();
