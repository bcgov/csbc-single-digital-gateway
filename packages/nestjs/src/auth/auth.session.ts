import type { CookieOptions, SessionOptions } from 'express-session';

import type { AuthSessionOptions } from './auth.types';

/** express-session options whose `cookie` is the static object form (never the function form). */
export type AuthSessionConfig = SessionOptions & { cookie: CookieOptions };

/**
 * Build hardened express-session options: `httpOnly` + `sameSite: 'lax'` (so the OIDC redirect
 * carries the cookie) + `secure` outside dev, with `resave`/`saveUninitialized` off. The
 * middleware itself is applied by the consumer (`app.use(session(...))`); the store is
 * consumer-provided (default `MemoryStore`).
 */
export function buildSessionOptions(options: AuthSessionOptions): AuthSessionConfig {
  const cookie: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: options.secure ?? false,
  };
  if (options.cookieMaxAge !== undefined) {
    cookie.maxAge = options.cookieMaxAge;
  }

  const config: AuthSessionConfig = {
    secret: options.secret,
    resave: false,
    saveUninitialized: false,
    cookie,
  };
  if (options.store !== undefined) {
    config.store = options.store;
  }
  return config;
}
