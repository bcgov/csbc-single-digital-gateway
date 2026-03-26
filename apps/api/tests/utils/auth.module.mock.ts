/**
 * Mock implementations for auth-module-related tests
 */

import * as client from 'openid-client';
import {
  type OidcProviderConfig,
  type OidcProviderRegistry,
} from 'src/modules/auth/auth.config';
import { IdpType } from 'src/modules/auth/types/idp';

/**
 * Creates a mock OIDC provider registry with optional custom client configurations for BCSC and IDIR.
 * @param bcscClient - Partial configuration for the BCSC client.
 * @param idirClient - Partial configuration for the IDIR client.
 * @returns A mock OIDC provider registry.
 */
export function createMockRegistry(
  bcscClient: Partial<client.Configuration> = {},
  idirClient: Partial<client.Configuration> = {},
): OidcProviderRegistry {
  const registry: OidcProviderRegistry = new Map();
  registry.set(IdpType.BCSC, {
    client: bcscClient,
    issuer: 'https://bcsc.example.com',
    redirectUri: 'https://example.com/auth/bcsc/callback',
    postLogoutRedirectUri: 'https://example.com',
    scopes: 'openid profile email',
  } as OidcProviderConfig);
  registry.set(IdpType.IDIR, {
    client: idirClient,
    issuer: 'https://idir.example.com',
    redirectUri: 'https://example.com/auth/idir/callback',
    postLogoutRedirectUri: 'https://example.com/admin',
    scopes: 'openid profile email',
  } as OidcProviderConfig);
  return registry;
}
