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
}

/**
 * Build the app's express-session options: the hardened cookie from `@repo/nestjs/auth` plus a
 * Valkey-backed `connect-redis` store in production (MemoryStore in dev/test). The Valkey/Redis
 * libs live here in platform-api, not in `@repo/nestjs`.
 */
export function buildAppSessionOptions(params: AppSessionParams): AuthSessionConfig {
  const options: { secret: string; secure: boolean; store?: Store } = {
    secret: params.secret,
    secure: params.secure,
  };

  if (params.useStore) {
    const client = new Valkey(params.valkeyUrl);
    options.store = new RedisStore({ client, prefix: 'sdg:sess:' });
  }

  return buildSessionOptions(options);
}
