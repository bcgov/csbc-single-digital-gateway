import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppConfigDto } from './common/dtos/app-config.dto';
import { AppHealthModule } from './modules/app-health.module';
import { AppModule } from './modules/app.module';

async function bootstrapMain() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService: ConfigService<AppConfigDto, true> =
    app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.enableCors();
  app.enableVersioning();

  const port = configService.get<number>('PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`API server listening on http://0.0.0.0:${port}`);
}

async function bootstrapHealth() {
  const app = await NestFactory.create(AppHealthModule, { bufferLogs: true });
  const configService = app.get(ConfigService<AppConfigDto, true>);
  const logger = app.get(Logger);

  app.useLogger(logger);

  const port = configService.get<number>('HEALTH_PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`Health check server listening on http://0.0.0.0:${port}`);
}

void (async () => {
  await bootstrapMain();
  await bootstrapHealth();
})();

// async function bootstrap() {
//   await bootstrap();
//   // Create main API application

//   // // Create separate health check application on port 9000
//   // const healthApp = await NestFactory.create(HealthOnlyModule, {
//   //   bufferLogs: true,
//   // });
//   // healthApp.useLogger(healthApp.get(Logger));

//   // // Start health server on port 9000 (internal only)
//   // await healthApp.listen(9000, '0.0.0.0');
//   // logger.log('Health check server listening on http://0.0.0.0:9000');

//   // Start main API server on configured port (default 4000)

//   // Create health API application
// }

// void bootstrap();
