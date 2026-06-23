import type { Configuration } from 'openid-client';

import type { AuthModuleOptions } from './auth.types';

/**
 * Resolve the OIDC `Configuration` — reuse a pre-built one (tests/advanced) or run discovery.
 *
 * openid-client v6 is ESM-only and `@repo/nestjs` is CommonJS, so it is loaded via dynamic
 * `import()` — a static import would fail typecheck (TS1479, CJS→ESM). `tsc` (NodeNext) and the
 * test SWC (`module: es6`) both preserve `import()`, and Node 24 loads the ESM module.
 */
export async function resolveOidcConfig(options: AuthModuleOptions): Promise<Configuration> {
  if (options.config) {
    return options.config;
  }
  const oidc = await import('openid-client');
  // Confidential client: the secret as the 3rd arg selects client_secret_* auth.
  return oidc.discovery(new URL(options.issuer), options.clientId, options.clientSecret);
}
