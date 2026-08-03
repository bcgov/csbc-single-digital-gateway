import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/app.module';
import { AuthModule, SESSION_REGISTRY } from '@repo/nestjs/auth';
import { LoggerModule } from '@repo/nestjs/logger';
import { DatabaseModule } from '@repo/nestjs/database';
import { ValkeySessionRegistry } from '../../src/auth/valkey-session-registry';

describe('AppModule Unit Test Suite', () => {
  it('should compile AppModule successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('should verify AuthModule useFactory behaviour under test and non-test environments', () => {
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

    // Let's mock ConfigService to test the useFactory implementation
    const mockConfigService = {
      get: vi.fn((key: string, _options?: { infer: boolean }) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'OIDC_ISSUER') return 'http://issuer';
        if (key === 'OIDC_CLIENT_ID') return 'client-id';
        if (key === 'OIDC_CLIENT_SECRET') return 'secret';
        if (key === 'OIDC_REDIRECT_URI') return 'http://redirect';
        if (key === 'AUTH_POST_LOGOUT_REDIRECT') return 'http://post-logout';
        if (key === 'AUTH_POST_LOGIN_REDIRECT') return 'http://post-login';
        if (key === 'AUTH_SESSION_SECRET') return 'session-secret';
        if (key === 'AUTH_RP_LOGOUT') return true;
        if (key === 'AUTH_ALLOWED_ORIGINS') return ['http://origin'];
        if (key === 'AUTH_TOKEN_REFRESH_SKEW_SECONDS') return 10;
        return undefined;
      }),
    } as unknown as ConfigService;

    // Test with NODE_ENV = 'test'
    const testOptions = useFactory(mockConfigService);
    expect(testOptions).toBeDefined();
    expect(testOptions.config).toBeDefined();
    expect(testOptions.issuer).toBe('http://issuer');

    // Test with NODE_ENV = 'production'
    mockConfigService.get = vi.fn((key: string, _options?: { infer: boolean }) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'OIDC_ISSUER') return 'http://issuer';
      if (key === 'OIDC_CLIENT_ID') return 'client-id';
      if (key === 'OIDC_CLIENT_SECRET') return 'secret';
      if (key === 'OIDC_REDIRECT_URI') return 'http://redirect';
      if (key === 'AUTH_POST_LOGOUT_REDIRECT') return 'http://post-logout';
      if (key === 'AUTH_POST_LOGIN_REDIRECT') return 'http://post-login';
      if (key === 'AUTH_SESSION_SECRET') return 'session-secret';
      if (key === 'AUTH_RP_LOGOUT') return true;
      if (key === 'AUTH_ALLOWED_ORIGINS') return ['http://origin'];
      if (key === 'AUTH_TOKEN_REFRESH_SKEW_SECONDS') return 10;
      return undefined;
    });

    const prodOptions = useFactory(mockConfigService);
    expect(prodOptions).toBeDefined();
    expect(prodOptions.config).toBeUndefined(); // Config stub should not be present in prod
    expect(prodOptions.issuer).toBe('http://issuer');

    // Test with undefined AUTH_POST_LOGOUT_REDIRECT
    mockConfigService.get = vi.fn((key: string, _options?: { infer: boolean }) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'OIDC_ISSUER') return 'http://issuer';
      if (key === 'OIDC_CLIENT_ID') return 'client-id';
      if (key === 'OIDC_CLIENT_SECRET') return 'secret';
      if (key === 'OIDC_REDIRECT_URI') return 'http://redirect';
      if (key === 'AUTH_POST_LOGIN_REDIRECT') return 'http://post-login';
      if (key === 'AUTH_SESSION_SECRET') return 'session-secret';
      if (key === 'AUTH_RP_LOGOUT') return true;
      if (key === 'AUTH_ALLOWED_ORIGINS') return ['http://origin'];
      if (key === 'AUTH_TOKEN_REFRESH_SKEW_SECONDS') return 10;
      return undefined;
    });
    const testOptionsNoPostLogout = useFactory(mockConfigService);
    expect(testOptionsNoPostLogout.postLogoutRedirect).toBeUndefined();
  });

  it('should verify LoggerModule useFactory behaviour under test, development, and other environments', async () => {
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

    // Mock ConfigService
    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'LOG_LEVEL') return 'info';
        return undefined;
      }),
    } as unknown as ConfigService;

    // Test env
    const testOptions = await useFactory(mockConfigService);
    expect(testOptions.pinoHttp.level).toBe('silent');

    // Dev env
    mockConfigService.get = vi.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'LOG_LEVEL') return 'debug';
      return undefined;
    });
    const devOptions = await useFactory(mockConfigService);
    expect(devOptions.pinoHttp.level).toBe('debug');
    expect(devOptions.pinoHttp.transport?.target).toBe('pino-pretty');

    // Prod env
    mockConfigService.get = vi.fn((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'LOG_LEVEL') return 'warn';
      return undefined;
    });
    const prodOptions = await useFactory(mockConfigService);
    expect(prodOptions.pinoHttp.level).toBe('warn');
    expect(prodOptions.pinoHttp.transport).toBeUndefined();
  });

  it('should verify DatabaseModule onDestroy end method is called', async () => {
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

  it('should verify AuthModule sessionRegistry provider useFactory', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const authModuleImport = imports.find((imp) => imp && imp.module === AuthModule);
    expect(authModuleImport).toBeDefined();

    const registryProvider = authModuleImport.providers.find(
      (p: any) => p && p.provide === SESSION_REGISTRY,
    );
    expect(registryProvider).toBeDefined();

    const sessionRegistryFactory = registryProvider.useFactory;
    expect(sessionRegistryFactory).toBeDefined();

    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'VALKEY_URL') return 'valkey://localhost:6379';
        if (key === 'SESSION_KEY_PREFIX') return 'prefix:';
        return undefined;
      }),
    } as unknown as ConfigService;

    const registry = sessionRegistryFactory(mockConfigService);
    expect(registry).toBeDefined();
    expect(registry).toBeInstanceOf(ValkeySessionRegistry);
  });
});
