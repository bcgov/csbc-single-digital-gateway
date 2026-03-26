import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'openid-client';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import {
  OIDC_PROVIDER_REGISTRY,
  oidcProviderRegistryProvider,
} from '../auth.config';
import { IdpType } from '../types/idp';

jest.mock('openid-client', () => ({
  discovery: jest.fn(),
  ClientSecretBasic: jest.fn(),
  ClientSecretPost: jest.fn(),
}));

describe('auth.config - oidcProviderRegistryProvider', () => {
  const mockedClient = client as unknown as {
    discovery: jest.Mock<
      Promise<unknown>,
      [unknown, unknown, unknown, unknown]
    >;
    ClientSecretBasic: jest.Mock;
    ClientSecretPost: jest.Mock;
  };

  type ConfigKey = keyof AppConfigDto;

  const createMockConfigService = (
    overrides: Partial<Record<ConfigKey, string>> = {},
  ) =>
    ({
      get: jest.fn((key: ConfigKey) => {
        const defaults: Partial<Record<ConfigKey, string>> = {
          OIDC_ISSUER: 'https://bcsc.example.com',
          OIDC_CLIENT_ID: 'bcsc-client-id',
          OIDC_CLIENT_SECRET: 'bcsc-client-secret',
          OIDC_CLIENT_AUTH_METHOD: 'client_secret_post',
          OIDC_REDIRECT_URI: 'https://api.example.com/auth/bcsc/callback',
          OIDC_POST_LOGOUT_REDIRECT_URI: 'https://app.example.com/logout/bcsc',

          AUTH_OIDC_ISSUER: 'https://idir.example.com',
          AUTH_OIDC_CLIENT_ID: 'idir-client-id',
          AUTH_OIDC_CLIENT_SECRET: 'idir-client-secret',
          AUTH_OIDC_CLIENT_AUTH_METHOD: 'client_secret_post',
          AUTH_OIDC_REDIRECT_URI: 'https://api.example.com/auth/idir/callback',
          AUTH_OIDC_POST_LOGOUT_REDIRECT_URI:
            'https://app.example.com/logout/idir',
        };

        return overrides[key] ?? defaults[key];
      }),
    }) as unknown as ConfigService<AppConfigDto, true>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should expose expected provider metadata', () => {
    expect(oidcProviderRegistryProvider.provide).toBe(OIDC_PROVIDER_REGISTRY);
    expect(oidcProviderRegistryProvider.inject).toEqual([ConfigService]);
    expect(typeof oidcProviderRegistryProvider.useFactory).toBe('function');
  });

  it('Should build registry with BCSC and IDIR providers when discovery succeeds', async () => {
    const mockConfigService = createMockConfigService();
    const bcscDiscoveredConfig = { provider: 'bcsc-config' };
    const idirDiscoveredConfig = { provider: 'idir-config' };

    const postAuthBcsc = { type: 'post-bcsc' };
    const postAuthIdir = { type: 'post-idir' };

    mockedClient.ClientSecretPost.mockReturnValueOnce(
      postAuthBcsc,
    ).mockReturnValueOnce(postAuthIdir);

    mockedClient.discovery
      .mockResolvedValueOnce(bcscDiscoveredConfig)
      .mockResolvedValueOnce(idirDiscoveredConfig);

    const loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    const registry =
      await oidcProviderRegistryProvider.useFactory(mockConfigService);

    expect(registry).toBeInstanceOf(Map);
    expect(registry.size).toBe(2);
    expect(registry.has(IdpType.BCSC)).toBe(true);
    expect(registry.has(IdpType.IDIR)).toBe(true);

    expect(registry.get(IdpType.BCSC)).toEqual({
      client: bcscDiscoveredConfig,
      issuer: 'https://bcsc.example.com',
      redirectUri: 'https://api.example.com/auth/bcsc/callback',
      postLogoutRedirectUri: 'https://app.example.com/logout/bcsc',
      scopes: 'openid profile email',
    });

    expect(registry.get(IdpType.IDIR)).toEqual({
      client: idirDiscoveredConfig,
      issuer: 'https://idir.example.com',
      redirectUri: 'https://api.example.com/auth/idir/callback',
      postLogoutRedirectUri: 'https://app.example.com/logout/idir',
      scopes: 'openid profile email',
    });

    expect(mockedClient.discovery).toHaveBeenCalledTimes(2);
    expect(loggerSpy).toHaveBeenCalledTimes(2);
    expect(loggerSpy).toHaveBeenCalledWith(
      'OIDC discovery completed for BCSC: https://bcsc.example.com',
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      'OIDC discovery completed for IDIR: https://idir.example.com',
    );

    loggerSpy.mockRestore();
  });

  it('Should call configService.get with all required config keys', async () => {
    const mockConfigService = createMockConfigService();

    mockedClient.ClientSecretPost.mockReturnValueOnce({
      type: 'post-1',
    }).mockReturnValueOnce({ type: 'post-2' });

    mockedClient.discovery.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    await oidcProviderRegistryProvider.useFactory(mockConfigService);

    const expectedKeys: ConfigKey[] = [
      'OIDC_ISSUER',
      'OIDC_CLIENT_ID',
      'OIDC_CLIENT_SECRET',
      'OIDC_CLIENT_AUTH_METHOD',
      'OIDC_REDIRECT_URI',
      'OIDC_POST_LOGOUT_REDIRECT_URI',
      'AUTH_OIDC_ISSUER',
      'AUTH_OIDC_CLIENT_ID',
      'AUTH_OIDC_CLIENT_SECRET',
      'AUTH_OIDC_CLIENT_AUTH_METHOD',
      'AUTH_OIDC_REDIRECT_URI',
      'AUTH_OIDC_POST_LOGOUT_REDIRECT_URI',
    ];

    const getMock = jest.spyOn(
      mockConfigService,
      'get',
    ) as unknown as jest.Mock;

    for (const key of expectedKeys) {
      expect(getMock.mock.calls).toContainEqual([key]);
    }

    expect(getMock.mock.calls.length).toBe(expectedKeys.length);
  });

  it('Should use ClientSecretBasic when auth method is client_secret_basic', async () => {
    const mockConfigService = createMockConfigService({
      OIDC_CLIENT_AUTH_METHOD: 'client_secret_basic',
      AUTH_OIDC_CLIENT_AUTH_METHOD: 'client_secret_post',
    });

    const basicAuth = { type: 'basic' };
    const postAuth = { type: 'post' };

    mockedClient.ClientSecretBasic.mockReturnValueOnce(basicAuth);
    mockedClient.ClientSecretPost.mockReturnValueOnce(postAuth);
    mockedClient.discovery.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    await oidcProviderRegistryProvider.useFactory(mockConfigService);

    expect(mockedClient.ClientSecretBasic).toHaveBeenCalledWith(
      'bcsc-client-secret',
    );
    expect(mockedClient.ClientSecretPost).toHaveBeenCalledWith(
      'idir-client-secret',
    );

    const [bcscCall, idirCall] = mockedClient.discovery.mock.calls;

    expect(bcscCall[0]).toBeInstanceOf(URL);
    expect((bcscCall[0] as URL).href).toBe('https://bcsc.example.com/');
    expect(bcscCall[1]).toBe('bcsc-client-id');
    expect(bcscCall[2]).toBeUndefined();
    expect(bcscCall[3]).toBe(basicAuth);

    expect(idirCall[0]).toBeInstanceOf(URL);
    expect((idirCall[0] as URL).href).toBe('https://idir.example.com/');
    expect(idirCall[1]).toBe('idir-client-id');
    expect(idirCall[2]).toBeUndefined();
    expect(idirCall[3]).toBe(postAuth);
  });

  it('Should default to ClientSecretPost for unknown auth method', async () => {
    const mockConfigService = createMockConfigService({
      OIDC_CLIENT_AUTH_METHOD: 'unsupported_method',
      AUTH_OIDC_CLIENT_AUTH_METHOD: 'another_unknown',
    });

    mockedClient.ClientSecretPost.mockReturnValueOnce({
      type: 'post-unknown-1',
    }).mockReturnValueOnce({ type: 'post-unknown-2' });

    mockedClient.discovery.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    await oidcProviderRegistryProvider.useFactory(mockConfigService);

    expect(mockedClient.ClientSecretBasic).not.toHaveBeenCalled();
    expect(mockedClient.ClientSecretPost).toHaveBeenCalledTimes(2);
    expect(mockedClient.ClientSecretPost).toHaveBeenNthCalledWith(
      1,
      'bcsc-client-secret',
    );
    expect(mockedClient.ClientSecretPost).toHaveBeenNthCalledWith(
      2,
      'idir-client-secret',
    );
  });

  it('Should propagate error when discovery fails', async () => {
    const mockConfigService = createMockConfigService();

    mockedClient.ClientSecretPost.mockReturnValueOnce({
      type: 'post-1',
    }).mockReturnValueOnce({ type: 'post-2' });

    mockedClient.discovery
      .mockRejectedValueOnce(new Error('BCSC discovery failed'))
      .mockResolvedValueOnce({});

    await expect(
      oidcProviderRegistryProvider.useFactory(mockConfigService),
    ).rejects.toThrow('BCSC discovery failed');
  });
});
