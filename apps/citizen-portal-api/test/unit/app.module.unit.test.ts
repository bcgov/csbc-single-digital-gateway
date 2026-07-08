import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/app.module';
import { AuthModule } from '@repo/nestjs/auth';

describe('AppModule Unit Tests', () => {
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
  });
});
