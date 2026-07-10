import type { PoolConfig } from 'pg';

/** Inputs for {@link resolvePgSsl} — libpq-style TLS settings, resolved by the caller. */
export interface PgSslOptions {
  /**
   * `PGSSLMODE`: `disable` | `no-verify` | `verify-ca` | `verify-full` (`require` is treated as
   * `verify-full`). Undefined/empty → no TLS (local dev, `sslmode=disable`).
   */
  mode?: string | undefined;
  /**
   * PEM contents of the CA that signed the server cert (NOT a path). For Crunchy Postgres this is
   * the `ca.crt` from the `<cluster>-cluster-cert` secret, injected as an env var.
   */
  ca?: string | undefined;
}

/**
 * Resolve a `pg` `ssl` config from libpq-style settings, to hand to {@link createDatabase} as
 * `options.ssl`. Kept out of the factory (which stays `process.env`-free) and out of `pg` itself
 * (which reads only `PGSSLMODE` from the env and ignores `PGSSLROOTCERT`, so it can't verify a
 * private CA). Returning `undefined` means "no TLS" — spread it and `pg` falls back to its own
 * defaults.
 *
 * - `verify-full` — encrypt + verify the chain against `ca` + check the hostname (SANs).
 * - `verify-ca`   — encrypt + verify the chain against `ca`, but skip the hostname check (use when
 *   the server cert's SANs don't include the connection host, e.g. a Crunchy service DNS name).
 * - `no-verify`   — encrypt only (no CA/host verification).
 */
export function resolvePgSsl({ mode, ca }: PgSslOptions): PoolConfig['ssl'] | undefined {
  const caOpt = ca && ca.trim() !== '' ? { ca } : {};

  switch (mode) {
    case undefined:
    case '':
    case 'disable':
      return undefined;
    case 'no-verify':
      return { rejectUnauthorized: false, ...caOpt };
    case 'verify-ca':
      return { ...caOpt, rejectUnauthorized: true, checkServerIdentity: () => undefined };
    case 'require':
    case 'verify-full':
    default:
      return { ...caOpt, rejectUnauthorized: true };
  }
}
