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
