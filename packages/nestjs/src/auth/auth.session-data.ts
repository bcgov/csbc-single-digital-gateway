import 'express-session';

import type { OidcTransaction } from './auth.flow';
import type { AuthUser, SessionTokens } from './auth.types';

// Augment express-session so `req.session.authUser` / `req.session.oidcTx` are typed.
declare module 'express-session' {
  interface SessionData {
    authUser?: AuthUser;
    oidcTx?: OidcTransaction;
    // The raw id_token, kept solely as the `id_token_hint` for RP-initiated logout.
    idToken?: string;
    // The OIDC token set (server-side only) for lazy refresh + downstream calls.
    tokens?: SessionTokens;
    // A sanitized, site-relative path to return the browser to after login (single-use). Set at
    // /auth/login, consumed + cleared at /auth/callback. Never a full URL, never sent to the client.
    returnTo?: string;
    // How many times the callback has auto-restarted login for THIS session. Bounds the restart so a
    // persistently-failing callback (e.g. a badly skewed clock) surfaces an error instead of
    // bouncing the browser between /auth/login and /auth/callback forever. Cleared on success.
    loginRetry?: number;
  }
}

// Augment the Express request so `req.authUser` (attached by the guard) is typed.
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}
