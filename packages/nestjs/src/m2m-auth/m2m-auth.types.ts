import type { JWTPayload } from 'jose';

/** The verified machine caller a valid client-credentials token represents. */
export interface M2mPrincipal {
  /** The calling client's id (`azp`, falling back to `client_id`). */
  clientId: string | undefined;
  /** The token subject (Keycloak: the service-account user id). */
  subject: string | undefined;
  /** The full verified JWT payload for anything else a handler needs. */
  claims: JWTPayload;
}

/**
 * Token-verification port. The production implementation is {@link OidcJwtVerifier} (JWKS);
 * tests inject a stub via {@link M2mAuthModuleOptions.verifier} so no IdP runs in the suite.
 * MUST throw on any invalid token — never resolve with a partial principal.
 */
export interface M2mTokenVerifier {
  verify(token: string): Promise<M2mPrincipal>;
}

/** Options for {@link M2mAuthModule}. */
export interface M2mAuthModuleOptions {
  /** OIDC issuer whose tokens are accepted (e.g. the Keycloak sdg realm URL). */
  issuer: string;
  /**
   * REQUIRED audience the token's `aud` must contain (e.g. `notification-service`). Not
   * optional by design: issuer alone also matches interactive login tokens from the same
   * realm, which must not reach an m2m resource server.
   */
  audience: string;
  /** Path prefixes exempt from auth (boundary-safe match), e.g. `['/health']`. */
  publicPaths?: string[];
  /** Override the verifier (tests). Production omits this → JWKS verification. */
  verifier?: M2mTokenVerifier;
}

// Augment the Express request so `req.m2mPrincipal` (attached by the guard) is typed.
declare global {
  namespace Express {
    interface Request {
      m2mPrincipal?: M2mPrincipal;
    }
  }
}
