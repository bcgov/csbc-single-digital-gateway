import './auth.session-data';

export { AuthModule } from './auth.module';
export type { AuthModuleAsyncOptions } from './auth.module';
export { AuthController } from './auth.controller';
export { AuthGuard } from './auth.guard';
export {
  CurrentUser,
  IS_PUBLIC_KEY,
  Public,
  ROLES_KEY,
  Roles,
  currentUser,
} from './auth.decorators';
export { buildLoginUrl, completeLogin } from './auth.flow';
export type { OidcLoginOptions, OidcTransaction } from './auth.flow';
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
