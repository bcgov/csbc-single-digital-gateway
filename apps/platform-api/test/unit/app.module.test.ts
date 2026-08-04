import { describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/app.module';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from '../../src/filters/http-exception.filter';
import { WorkspacesModule } from '../../src/modules/workspaces/workspaces.module';
import { DocumentTypesModule } from '../../src/modules/document-types/document-types.module';
import { ServicesModule } from '../../src/modules/services/services.module';
import { FormsModule } from '../../src/modules/forms/forms.module';
import { SubmissionsModule } from '../../src/modules/submissions/submissions.module';
import { createDatabase, resolvePgSsl } from '@repo/database';
import Valkey from 'iovalkey';
import { ValkeySessionRegistry } from '../../src/auth/valkey-session-registry';

vi.mock('@repo/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/database')>();
  return {
    ...actual,
    createDatabase: vi.fn().mockReturnValue({ $client: { end: vi.fn() } }),
    resolvePgSsl: vi.fn().mockReturnValue({}),
  };
});

vi.mock('iovalkey', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {};
    }),
  };
});

vi.mock('../../src/auth/valkey-session-registry', () => ({
  ValkeySessionRegistry: vi.fn(),
}));

class MockConfigService {
  constructor(private readonly values: Record<string, any>) {}
  get(key: string) {
    return this.values[key];
  }
}

describe('AppModule metadata and factories tests', () => {
  const imports = Reflect.getMetadata('imports', AppModule) as any[];
  const providers = Reflect.getMetadata('providers', AppModule) as any[];

  it('should have all feature modules registered correctly', () => {
    expect(imports).toBeDefined();
    expect(imports).toContain(WorkspacesModule);
    expect(imports).toContain(DocumentTypesModule);
    expect(imports).toContain(ServicesModule);
    expect(imports).toContain(FormsModule);
    expect(imports).toContain(SubmissionsModule);
  });

  it('should have global providers, interceptors, and filters registered correctly', () => {
    expect(providers).toBeDefined();

    const pipeProvider = providers.find((p) => p.provide === APP_PIPE);
    expect(pipeProvider).toBeDefined();
    expect(pipeProvider.useClass).toBe(ZodValidationPipe);

    const interceptorProvider = providers.find((p) => p.provide === APP_INTERCEPTOR);
    expect(interceptorProvider).toBeDefined();
    expect(interceptorProvider.useClass).toBe(ZodSerializerInterceptor);

    const filterProvider = providers.find((p) => p.provide === APP_FILTER);
    expect(filterProvider).toBeDefined();
    expect(filterProvider.useClass).toBe(HttpExceptionFilter);
  });

  describe('LoggerModule factory', () => {
    const loggerModule = imports.find(
      (imp) => typeof imp === 'object' && imp !== null && imp.module?.name === 'LoggerModule',
    );
    const pinoParamsProvider = loggerModule?.imports?.[0]?.providers?.find(
      (p: any) => p.provide === 'pino-params',
    );

    it('sets silent level in test environments', async () => {
      const config = new MockConfigService({ NODE_ENV: 'test', LOG_LEVEL: 'info' });
      const options = await pinoParamsProvider.useFactory(config);

      expect(options.pinoHttp.level).toBe('silent');
      expect(options.pinoHttp.transport).toBeUndefined();
    });

    it('sets configured log level in production environments without pretty print', async () => {
      const config = new MockConfigService({ NODE_ENV: 'production', LOG_LEVEL: 'warn' });
      const options = await pinoParamsProvider.useFactory(config);

      expect(options.pinoHttp.level).toBe('warn');
      expect(options.pinoHttp.transport).toBeUndefined();
    });

    it('enables pretty printing in development environment', async () => {
      const config = new MockConfigService({ NODE_ENV: 'development', LOG_LEVEL: 'debug' });
      const options = await pinoParamsProvider.useFactory(config);

      expect(options.pinoHttp.level).toBe('debug');
      expect(options.pinoHttp.transport.target).toBe('pino-pretty');
    });
  });

  describe('DatabaseModule factory', () => {
    const dbModule = imports.find(
      (imp) => typeof imp === 'object' && imp !== null && imp.module?.name === 'DatabaseModule',
    );
    const dbClientProvider = dbModule?.providers?.find(
      (p: any) => p.provide && p.provide.toString() === 'Symbol(DATABASE_CLIENT)',
    );
    const dbShutdownProvider = dbModule?.providers?.find(
      (p: any) => p.provide && p.provide.toString() === 'Symbol(DATABASE_SHUTDOWN)',
    );

    it('creates database client with SSL mode CA cert configuration', () => {
      const config = new MockConfigService({
        DATABASE_URL: 'postgres://localhost/test',
        PGSSLMODE: 'require',
        DATABASE_CA_CERT: 'CERT_DATA',
      });

      dbClientProvider.useFactory(config);

      expect(resolvePgSsl).toHaveBeenCalledWith({
        mode: 'require',
        ca: 'CERT_DATA',
      });
      expect(createDatabase).toHaveBeenCalledWith('postgres://localhost/test', {
        ssl: expect.any(Object),
      });
    });

    it('closes database client connection on module destroy', () => {
      const endMock = vi.fn();
      const mockDb = { $client: { end: endMock } };

      const shutdownHook = dbShutdownProvider.useFactory(mockDb);
      if (typeof shutdownHook.onApplicationShutdown === 'function') {
        shutdownHook.onApplicationShutdown();
      } else if (typeof shutdownHook.beforeApplicationShutdown === 'function') {
        shutdownHook.beforeApplicationShutdown();
      }

      expect(endMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('AuthModule factory', () => {
    const authModule = imports.find(
      (imp) => typeof imp === 'object' && imp !== null && imp.module?.name === 'AuthModule',
    );

    describe('sessionRegistry factory', () => {
      const sessionRegistryProvider = authModule?.providers?.find(
        (p: any) => p.provide && p.provide.toString() === 'Symbol(SESSION_REGISTRY)',
      );

      it('instantiates ValkeySessionRegistry with a lazy connection', () => {
        const config = new MockConfigService({
          VALKEY_URL: 'valkey://localhost:6379',
          SESSION_KEY_PREFIX: 'csbc:',
        });

        sessionRegistryProvider.useFactory(config);

        expect(Valkey).toHaveBeenCalledWith('valkey://localhost:6379', { lazyConnect: true });
        expect(ValkeySessionRegistry).toHaveBeenCalledWith(expect.any(Object), 'csbc:');
      });
    });

    describe('auth options factory', () => {
      const authOptionsProvider = authModule?.providers?.find(
        (p: any) => p.provide && p.provide.toString() === 'Symbol(AUTH_OPTIONS)',
      );

      it('returns stub config under test environments', () => {
        const config = new MockConfigService({
          NODE_ENV: 'test',
          AUTH_POST_LOGOUT_REDIRECT: 'https://logout.redirect',
          OIDC_ISSUER: 'https://issuer',
          OIDC_CLIENT_ID: 'client',
          OIDC_CLIENT_SECRET: 'secret',
          OIDC_REDIRECT_URI: 'https://redirect',
          AUTH_SESSION_SECRET: 'session-secret',
          AUTH_RP_LOGOUT: true,
          AUTH_ALLOWED_ORIGINS: ['https://allowed'],
          AUTH_TOKEN_REFRESH_SKEW_SECONDS: 30,
        });

        const options = authOptionsProvider.useFactory(config);

        expect(options.config).toEqual({});
        expect(options.postLogoutRedirect).toBe('https://logout.redirect');
      });

      it('returns regular options without stub config under non-test environments', () => {
        const config = new MockConfigService({
          NODE_ENV: 'production',
          OIDC_ISSUER: 'https://issuer',
          OIDC_CLIENT_ID: 'client',
          OIDC_CLIENT_SECRET: 'secret',
          OIDC_REDIRECT_URI: 'https://redirect',
          AUTH_SESSION_SECRET: 'session-secret',
          AUTH_RP_LOGOUT: true,
          AUTH_ALLOWED_ORIGINS: ['https://allowed'],
          AUTH_TOKEN_REFRESH_SKEW_SECONDS: 30,
        });

        const options = authOptionsProvider.useFactory(config);

        expect(options.config).toBeUndefined();
        expect(options.postLogoutRedirect).toBeUndefined();
      });
    });
  });
});
