import './auth.session-data';

export { AuthModule } from './auth.module';
export type { AuthModuleAsyncOptions } from './auth.module';
export { AuthController } from './auth.controller';
export { AuthGuard } from './auth.guard';
export { CsrfGuard } from './csrf.guard';
export { TokenRefreshGuard } from './token-refresh.guard';
export {
  AccessToken,
  CurrentUser,
  IS_PUBLIC_KEY,
  Public,
  ROLES_KEY,
  Roles,
  SKIP_CSRF_KEY,
  SkipCsrf,
  accessToken,
  currentUser,
} from './auth.decorators';
export {
  buildLoginUrl,
  buildLogoutUrl,
  completeLogin,
  OidcCallbackError,
  refreshTokens,
  toSessionTokens,
} from './auth.flow';
export type {
  CompletedLogin,
  LogoutUrlOptions,
  OidcLoginOptions,
  OidcTransaction,
} from './auth.flow';
export { AUTH_OPTIONS, OIDC_CONFIG, AUTH_USER_SYNC, SESSION_REGISTRY } from './auth.constants';
export { buildSessionOptions } from './auth.session';
export type { AuthSessionConfig } from './auth.session';
export { passthroughUserSync } from './auth.user-sync';
export { noopSessionRegistry } from './session-registry';
export type { SessionRegistry } from './session-registry';
export { resolveOidcConfig } from './oidc.provider';
export type {
  AuthModuleOptions,
  AuthSessionOptions,
  AuthUser,
  AuthUserSync,
  OidcClaims,
  SessionTokens,
} from './auth.types';
