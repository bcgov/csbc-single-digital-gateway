import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/app.module';
import { AuthModule, SESSION_REGISTRY } from '@repo/nestjs/auth';
import { LoggerModule } from '@repo/nestjs/logger';
import { DatabaseModule } from '@repo/nestjs/database';
import { ValkeySessionRegistry } from '../../src/auth/valkey-session-registry';
import { createMockConfigService } from '../utils/createMockConfigService';

describe('AppModule Unit Test Suite', () => {
  it('Should compile AppModule successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('Should verify AuthModule useFactory behaviour under test and non-test environments', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    expect(imports).toBeDefined();

    // Find the AuthModule dynamic module
    const authModuleImport = imports.find(
      (imp) =>
        imp && (imp.module === AuthModule || (imp.module && imp.module.name === 'AuthModule')),
    );
    expect(authModuleImport).toBeDefined();

    // In NestJS custom async config provider/factory registration, the providers array of the
    // dynamic module contains the factory provider. Let's find it.
    const providers = authModuleImport.providers || [];
    const factoryProvider = providers.find((p: any) => p && typeof p.useFactory === 'function');

    // Fallback: if not found, we can check the dynamic module options directly
    const useFactory = factoryProvider ? factoryProvider.useFactory : authModuleImport.useFactory;
    expect(useFactory).toBeDefined();

    // Test with NODE_ENV = 'test'
    const testOptions = useFactory(createMockConfigService());
    expect(testOptions).toBeDefined();
    expect(testOptions.config).toBeDefined();
    expect(testOptions.issuer).toBe('http://issuer');
    expect(testOptions.clockToleranceSeconds).toBe(5);

    // Test with NODE_ENV = 'production'
    const prodOptions = useFactory(
      createMockConfigService({ NODE_ENV: 'production', AUTH_CLOCK_TOLERANCE_SECONDS: 15 }),
    );
    expect(prodOptions).toBeDefined();
    expect(prodOptions.config).toBeUndefined(); // Config stub should not be present in prod
    expect(prodOptions.issuer).toBe('http://issuer');
    expect(prodOptions.clockToleranceSeconds).toBe(15);

    // Test with undefined AUTH_POST_LOGOUT_REDIRECT and undefined AUTH_CLOCK_TOLERANCE_SECONDS
    const testOptionsNoPostLogout = useFactory(
      createMockConfigService({
        AUTH_POST_LOGOUT_REDIRECT: undefined,
        AUTH_CLOCK_TOLERANCE_SECONDS: undefined,
      }),
    );
    expect(testOptionsNoPostLogout.postLogoutRedirect).toBeUndefined();
    expect(testOptionsNoPostLogout.clockToleranceSeconds).toBeUndefined();
  });

  it('Should verify LoggerModule useFactory behaviour under test, development, and other environments', async () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const loggerModuleImport = imports.find((imp) => imp && imp.module === LoggerModule);
    expect(loggerModuleImport).toBeDefined();

    // Find PinoLoggerModule's import inside LoggerModule's imports
    const pinoLoggerImport = loggerModuleImport.imports?.find((imp: any) => imp && imp.providers);
    expect(pinoLoggerImport).toBeDefined();

    const factoryProvider = pinoLoggerImport.providers.find(
      (p: any) => p && typeof p.useFactory === 'function',
    );
    expect(factoryProvider).toBeDefined();
    const useFactory = factoryProvider.useFactory;

    // Test env
    const testOptions = await useFactory(
      createMockConfigService({ NODE_ENV: 'test', LOG_LEVEL: 'info' }),
    );
    expect(testOptions.pinoHttp.level).toBe('silent');

    // Dev env
    const devOptions = await useFactory(
      createMockConfigService({ NODE_ENV: 'development', LOG_LEVEL: 'debug' }),
    );
    expect(devOptions.pinoHttp.level).toBe('debug');
    expect(devOptions.pinoHttp.transport?.target).toBe('pino-pretty');

    // Prod env
    const prodOptions = await useFactory(
      createMockConfigService({ NODE_ENV: 'production', LOG_LEVEL: 'warn' }),
    );
    expect(prodOptions.pinoHttp.level).toBe('warn');
    expect(prodOptions.pinoHttp.transport).toBeUndefined();
  });

  it('Should verify DatabaseModule onDestroy end method is called', async () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const databaseModuleImport = imports.find((imp) => imp && imp.module === DatabaseModule);
    expect(databaseModuleImport).toBeDefined();

    const shutdownProvider = databaseModuleImport.providers.find(
      (p: any) =>
        p && p.inject && p.inject[0] && p.inject[0].toString().includes('DATABASE_CLIENT'),
    );
    expect(shutdownProvider).toBeDefined();

    const mockEnd = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      $client: {
        end: mockEnd,
      },
    } as any;

    const shutdownInstance = shutdownProvider.useFactory(mockDb);
    await shutdownInstance.onApplicationShutdown();
    expect(mockEnd).toHaveBeenCalled();
  });

  it('Should verify AuthModule sessionRegistry provider useFactory', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const authModuleImport = imports.find((imp) => imp && imp.module === AuthModule);
    expect(authModuleImport).toBeDefined();

    const registryProvider = authModuleImport.providers.find(
      (p: any) => p && p.provide === SESSION_REGISTRY,
    );
    expect(registryProvider).toBeDefined();

    const sessionRegistryFactory = registryProvider.useFactory;
    expect(sessionRegistryFactory).toBeDefined();

    const registry = sessionRegistryFactory(
      createMockConfigService({
        VALKEY_URL: 'valkey://localhost:6379',
        SESSION_KEY_PREFIX: 'prefix:',
      }),
    );
    expect(registry).toBeDefined();
    expect(registry).toBeInstanceOf(ValkeySessionRegistry);
  });
});
