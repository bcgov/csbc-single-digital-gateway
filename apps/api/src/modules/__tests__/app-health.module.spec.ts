import { ConfigService } from '@nestjs/config';
import 'reflect-metadata';
import { AppConfigSchema } from 'src/common/dtos/app-config.dto';
import {
  mockConfigForRoot,
  MockDatabaseModule,
  MockHealthModule,
  mockLoggerForRootAsync,
} from 'tests/utils/app.module.mock';

jest.mock('@nestjs/config', () => {
  const actual = jest.requireActual('@nestjs/config') as unknown as Record<
    string,
    unknown
  >;

  class MockConfigService {}

  return {
    ...actual,
    ConfigService: MockConfigService,
    ConfigModule: {
      forRoot: (options: unknown) => mockConfigForRoot(options),
    },
  } as never;
});

jest.mock('nestjs-pino', () => ({
  LoggerModule: {
    forRootAsync: (options: unknown) => mockLoggerForRootAsync(options),
  },
}));

jest.mock('../database/database.module', () => ({
  DatabaseModule: MockDatabaseModule,
}));

jest.mock('../health/health.module', () => ({
  HealthModule: MockHealthModule,
}));

import { mockConfigService } from 'tests/utils/auth.controllers.mock';
import { AppHealthModule } from '../app-health.module';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';

describe('AppHealthModule', () => {
  it('Should validate that AppHealthModule is defined', () => {
    expect(AppHealthModule).toBeDefined();
  });

  it('Should call ConfigModule.forRoot exactly once', () => {
    expect(mockConfigForRoot).toHaveBeenCalledTimes(1);
  });

  it('Should call LoggerModule.forRootAsync exactly once', () => {
    expect(mockLoggerForRootAsync).toHaveBeenCalledTimes(1);
  });

  it('Should configure ConfigModule.forRoot with isGlobal true', () => {
    const options = mockConfigForRoot.mock.calls[0][0] as {
      isGlobal: boolean;
      validate: (config: Record<string, unknown>) => unknown;
    };

    expect(options.isGlobal).toBe(true);
    expect(typeof options.validate).toBe('function');
  });

  it('Should delegate validate function to AppConfigSchema.parse', () => {
    const options = mockConfigForRoot.mock.calls[0][0] as {
      validate: (config: Record<string, unknown>) => unknown;
    };

    const input = { NODE_ENV: 'development', PORT: '9000' };
    const parsed = { NODE_ENV: 'development', PORT: 9000 };

    const parseSpy = jest
      .spyOn(AppConfigSchema, 'parse')
      .mockReturnValue(parsed as never);

    const result = options.validate(input);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenCalledWith(input);
    expect(result).toEqual(parsed);

    parseSpy.mockRestore();
  });

  it('Should configure LoggerModule.forRootAsync with ConfigService injection', () => {
    const options = mockLoggerForRootAsync.mock.calls[0][0] as {
      inject: unknown[];
      useFactory: (configService: { get: (key: string) => string }) => unknown;
    };

    expect(Array.isArray(options.inject)).toBe(true);
    expect(options.inject).toContain(ConfigService);
    expect(typeof options.useFactory).toBe('function');
  });

  it('Should set debug level and pino-pretty transport when NODE_ENV is not production', () => {
    const options = mockLoggerForRootAsync.mock.calls[0][0] as {
      useFactory: (configService: { get: (key: string) => string }) => {
        pinoHttp: { level: string; transport?: { target: string } };
      };
    };

    mockConfigService.get.mockReturnValue('development');

    const result = options.useFactory(mockConfigService);

    expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
    expect(result.pinoHttp.level).toBe('debug');
    expect(result.pinoHttp.transport).toEqual({ target: 'pino-pretty' });
  });

  it('Should set info level and undefined transport when NODE_ENV is production', () => {
    const options = mockLoggerForRootAsync.mock.calls[0][0] as {
      useFactory: (configService: { get: (key: string) => string }) => {
        pinoHttp: { level: string; transport?: { target: string } };
      };
    };

    mockConfigService.get.mockReturnValue('production');

    const result = options.useFactory(mockConfigService);

    expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
    expect(result.pinoHttp.level).toBe('info');
    expect(result.pinoHttp.transport).toBeUndefined();
  });

  it('Should include expected imports in @Module metadata', () => {
    const importsMetadata = Reflect.getMetadata(
      'imports',
      AppHealthModule,
    ) as unknown[];

    expect(Array.isArray(importsMetadata)).toBe(true);
    expect(importsMetadata).toHaveLength(4);
    expect(importsMetadata).toContain(DatabaseModule);
    expect(importsMetadata).toContain(HealthModule);
  });

  it('Should include dynamic ConfigModule and LoggerModule imports in metadata', () => {
    const importsMetadata = Reflect.getMetadata(
      'imports',
      AppHealthModule,
    ) as unknown[];

    const configDynamicImport = mockConfigForRoot.mock.results[0]
      .value as never;
    const loggerDynamicImport = mockLoggerForRootAsync.mock.results[0]
      .value as never;

    expect(importsMetadata).toContain(configDynamicImport);
    expect(importsMetadata).toContain(loggerDynamicImport);
  });
});
