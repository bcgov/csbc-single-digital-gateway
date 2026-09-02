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
  const server = new URL(options.issuer);
  // openid-client v6 forbids non-HTTPS issuers by default; opt in ONLY for http:// issuers
  // (local/dev IdPs like a dockerized Keycloak). Production issuers are https and unaffected.
  const discoveryOptions =
    server.protocol === 'http:' ? { execute: [oidc.allowInsecureRequests] } : undefined;
  // Confidential client: the secret as the 3rd arg selects client_secret_* auth.
  //
  // `clockTolerance` is a SYMBOL key on the client METADATA (not on the Configuration), so raising
  // it means passing an object instead of the bare secret string. openid-client already defaults it
  // to 30s, so the unset path deliberately keeps passing the plain string — byte-identical to
  // before this option existed, and no risk to client-auth selection.
  const metadata =
    options.clockToleranceSeconds === undefined
      ? options.clientSecret
      : {
          client_secret: options.clientSecret,
          [oidc.clockTolerance]: options.clockToleranceSeconds,
        };
  return oidc.discovery(server, options.clientId, metadata, undefined, discoveryOptions);
}
