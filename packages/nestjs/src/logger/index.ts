export { LoggerModule } from './logger.module';
export type { LoggerModuleAsyncOptions } from './logger.module';
export { buildLoggerParams } from './logger.params';
export type { LoggerModuleOptions } from './logger.params';
// Re-export so consumers need no direct nestjs-pino dependency.
export { Logger, PinoLogger, InjectPinoLogger } from 'nestjs-pino';
