import { buildSessionOptions } from '@repo/nestjs/auth';
import type { AuthSessionConfig } from '@repo/nestjs/auth';
import { RedisStore } from 'connect-redis';
import type { Store } from 'express-session';
import Valkey from 'iovalkey';

export interface AppSessionParams {
  secret: string;
  secure: boolean;
  /** Use the Valkey-backed store (production); otherwise express-session's MemoryStore. */
  useStore: boolean;
  valkeyUrl: string;
  /** Per-app Valkey key prefix (e.g. `sdg:`); the store keys become `${sessionKeyPrefix}sess:`. */
  sessionKeyPrefix: string;
}

/**
 * Build the app's express-session options: the hardened cookie from `@repo/nestjs/auth` plus a
 * Valkey-backed `connect-redis` store in production (MemoryStore in dev/test). The Valkey/Redis
 * libs live here in platform-api, not in `@repo/nestjs`.
 */
export function buildAppSessionOptions(params: AppSessionParams): AuthSessionConfig {
  const options: { secret: string; secure: boolean; cookieName: string; store?: Store } = {
    secret: params.secret,
    secure: params.secure,
    // Per-app cookie name (e.g. `cpa.sid`) so co-hosted BFFs on the same host don't clobber each
    // other's session cookie (cookies ignore port). Derived from the already-unique key prefix.
    cookieName: `${params.sessionKeyPrefix.replace(/:+$/, '')}.sid`,
  };

  if (params.useStore) {
    const client = new Valkey(params.valkeyUrl);
    options.store = new RedisStore({ client, prefix: `${params.sessionKeyPrefix}sess:` });
  }

  return buildSessionOptions(options);
}
