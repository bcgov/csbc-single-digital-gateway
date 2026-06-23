import { Module } from '@nestjs/common';
import type { DynamicModule, InjectionToken, ModuleMetadata } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { buildLoggerParams } from './logger.params';
import type { LoggerModuleOptions } from './logger.params';

export interface LoggerModuleAsyncOptions<TArgs extends unknown[] = unknown[]> extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: InjectionToken[];
  useFactory: (...args: TArgs) => LoggerModuleOptions | Promise<LoggerModuleOptions>;
}

/**
 * Configures pino logging for the app (wraps nestjs-pino, which registers globally). Pair
 * with `NestFactory.create(App, { bufferLogs: true })` + `app.useLogger(app.get(Logger))`
 * in `main.ts` to route all Nest logs through pino.
 */
@Module({})
export class LoggerModule {
  /** Configure with static options. */
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    return {
      module: LoggerModule,
      imports: [PinoLoggerModule.forRoot(buildLoggerParams(options))],
    };
  }

  /** Configure with options resolved from DI (e.g. `ConfigService`). */
  static forRootAsync<TArgs extends unknown[]>(
    options: LoggerModuleAsyncOptions<TArgs>,
  ): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        PinoLoggerModule.forRootAsync({
          imports: options.imports ?? [],
          inject: options.inject ?? [],
          useFactory: async (...args: TArgs) =>
            buildLoggerParams(await options.useFactory(...args)),
        }),
      ],
    };
  }
}
