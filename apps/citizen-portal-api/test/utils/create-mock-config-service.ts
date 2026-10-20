import type { Env } from '@/config/env.schema';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';

/**
 * Creates a ConfigService mock with default values and optional overrides.
 * @param overrides - Optional overrides for the default config values.
 * @returns A mock ConfigService object.
 */
export const createMockConfigService = (overrides: Record<string, unknown> = {}) => {
  const config: Record<string, unknown> = {
    NODE_ENV: 'test',
    OIDC_ISSUER: 'http://issuer',
    OIDC_CLIENT_ID: 'client-id',
    OIDC_CLIENT_SECRET: 'secret',
    OIDC_REDIRECT_URI: 'http://redirect',
    AUTH_POST_LOGOUT_REDIRECT: 'http://post-logout',
    AUTH_POST_LOGIN_REDIRECT: 'http://post-login',
    AUTH_SESSION_SECRET: 'session-secret',
    AUTH_RP_LOGOUT: true,
    AUTH_ALLOWED_ORIGINS: ['http://origin'],
    AUTH_TOKEN_REFRESH_SKEW_SECONDS: 10,
    AUTH_CLOCK_TOLERANCE_SECONDS: 5,
    NOTIFICATIONS_M2M_ISSUER: 'http://auth.issuer',
    NOTIFICATIONS_M2M_CLIENT_ID: 'client-id',
    NOTIFICATIONS_M2M_CLIENT_SECRET: 'client-secret',
    NOTIFICATION_SERVICE_URL: 'http://notification.service',
    BC_GEOCODER_URL: 'https://geocoder.example',
    BC_GEOCODER_API_KEY: 'api-key',
    ...overrides,
  };
  return {
    get: vi.fn((key: string) => config[key]),
  } as unknown as ConfigService<Env, true>;
};
