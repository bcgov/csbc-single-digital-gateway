/**
 * Mock implementations for auth-related tests
 */

import type { Request, Response } from 'express';
import { IdpType } from 'src/modules/auth/types/idp';

/**
 * A mock session object that includes a save method, which is commonly used in authentication flows to persist
 * session changes.
 */
export type MockSession = {
  save: jest.Mock;
  [key: string]: unknown;
};

/**
 * A mock authentication service that includes jest mock functions for methods related to building authorization URLs,
 * handling callbacks, building logout URLs, and getting user profiles. This allows tests to simulate authentication
 * flows without relying on actual implementations.
 */
type MockAuthService = {
  buildAuthorizationUrl: jest.Mock<Promise<string>, [IdpType, MockSession]>;
  handleCallback: jest.Mock<Promise<void>, [IdpType, URL, MockSession]>;
  buildLogoutUrl: jest.Mock<string, [IdpType, MockSession]>;
  getUserProfile: jest.Mock<unknown, [IdpType, MockSession]>;
};

/**
 * An instance of the MockAuthService with all methods initialized as jest mock functions. Tests can configure the
 * return values and implementations of these methods as needed to simulate different authentication scenarios.
 */
export const mockAuthService: MockAuthService = {
  buildAuthorizationUrl: jest.fn<Promise<string>, [IdpType, MockSession]>(),
  handleCallback: jest.fn<Promise<void>, [IdpType, URL, MockSession]>(),
  buildLogoutUrl: jest.fn<string, [IdpType, MockSession]>(),
  getUserProfile: jest.fn<unknown, [IdpType, MockSession]>(),
};

/**
 * A simple mock for ConfigService that specifies return values for get method.
 */
export const mockConfigService = {
  get: jest.fn(),
};

/**
 * Makes a mock request object with optional overrides for session, query, protocol, host, and originalUrl.
 * @param overrides - Partial properties to override in the mock request.
 * @returns - A mock Request object with a session that includes a save method.
 */
export const buildMockRequest = (
  overrides: Partial<{
    query: Record<string, string>;
    session: Record<string, unknown>;
    protocol: string;
    host: string;
    originalUrl: string;
  }> = {},
) =>
  ({
    query: overrides.query ?? {},
    session: {
      save: jest.fn((cb: (err?: Error) => void) => cb()),
      returnTo: undefined,
      ...overrides.session,
    } as MockSession,
    protocol: overrides.protocol ?? 'https',
    get: jest.fn().mockReturnValue(overrides.host ?? 'api.example.com'),
    originalUrl: overrides.originalUrl ?? '/auth/idir/callback?code=abc',
  }) as unknown as Request & { session: MockSession };

/**
 * Makes a mock response object with jest mock functions for redirect, json, and status methods.
 * @returns - A mock Response object with jest mock functions.
 */
export const buildMockResponse = () => {
  const res = {
    redirect: jest.fn(),
    json: jest.fn(),
    status: jest.fn(),
  } as unknown as Response & {
    redirect: jest.Mock;
    json: jest.Mock;
    status: jest.Mock;
  };
  res.status?.mockReturnValue(res);
  return res;
};
