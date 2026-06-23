export { AuthModule } from './auth.module';
export type { AuthModuleAsyncOptions } from './auth.module';
export { AUTH_OPTIONS, OIDC_CONFIG, AUTH_USER_SYNC } from './auth.constants';
export { buildSessionOptions } from './auth.session';
export type { AuthSessionConfig } from './auth.session';
export { passthroughUserSync } from './auth.user-sync';
export { resolveOidcConfig } from './oidc.provider';
export type {
  AuthModuleOptions,
  AuthSessionOptions,
  AuthUser,
  AuthUserSync,
  OidcClaims,
} from './auth.types';
