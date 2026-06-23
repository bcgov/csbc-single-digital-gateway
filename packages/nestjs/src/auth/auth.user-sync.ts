import type { AuthUserSync } from './auth.types';

/**
 * Default sync port: build the session user straight from the OIDC claims with no roles and no
 * persistence. Wave 1 uses this; consumers (Wave 3) override `AUTH_USER_SYNC` to upsert the
 * user into their DB and assign roles.
 */
export const passthroughUserSync: AuthUserSync = {
  onSignIn(claims) {
    return Promise.resolve({ id: claims.sub, roles: [], claims });
  },
};
