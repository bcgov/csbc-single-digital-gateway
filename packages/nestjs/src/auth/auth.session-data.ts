import 'express-session';

import type { OidcTransaction } from './auth.flow';
import type { AuthUser } from './auth.types';

// Augment express-session so `req.session.authUser` / `req.session.oidcTx` are typed.
declare module 'express-session' {
  interface SessionData {
    authUser?: AuthUser;
    oidcTx?: OidcTransaction;
  }
}
