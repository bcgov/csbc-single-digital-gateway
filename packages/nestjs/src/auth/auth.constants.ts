/** Resolved {@link AuthModuleOptions}. */
export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');

/** The discovered openid-client `Configuration` (shared, built once at startup). */
export const OIDC_CONFIG = Symbol('OIDC_CONFIG');

/** The {@link AuthUserSync} port — `onSignIn(claims) -> AuthUser`. Passthrough by default. */
export const AUTH_USER_SYNC = Symbol('AUTH_USER_SYNC');

/** The {@link SessionRegistry} port — tracks sessions per user for "logout everywhere". */
export const SESSION_REGISTRY = Symbol('SESSION_REGISTRY');
