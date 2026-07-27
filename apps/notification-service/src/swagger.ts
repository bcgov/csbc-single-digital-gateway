import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/**
 * Mount two Swagger UIs split on the `/v1` path prefix: the base (unversioned: `/health`) at
 * `/docs` and the versioned API at `/v1/docs`. nestjs-zod emits the schemas from the Zod DTOs;
 * `cleanupOpenApiDoc` finalises each document. No-op in production so the API surface isn't exposed.
 */
export function setupSwagger(app: INestApplication, nodeEnv: string): void {
  if (nodeEnv === 'production') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Notification Service')
    .setDescription('Notification ingestion and delivery service for the Single Digital Gateway.')
    .setVersion('1.0')
    .build();

  const full = SwaggerModule.createDocument(app, config);

  const withPaths = (keep: (path: string) => boolean): OpenAPIObject => ({
    ...full,
    paths: Object.fromEntries(Object.entries(full.paths).filter(([path]) => keep(path))),
  });

  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(withPaths((path) => !path.startsWith('/v1'))));
  SwaggerModule.setup(
    'v1/docs',
    app,
    cleanupOpenApiDoc(withPaths((path) => path.startsWith('/v1'))),
  );
}
