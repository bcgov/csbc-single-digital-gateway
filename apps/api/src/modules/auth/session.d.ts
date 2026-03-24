import type { UserProfile } from './services/auth.service';

export interface IdpSessionData {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenExpiresAt?: number;
  userProfile?: UserProfile;
  userId?: string;
}

declare module 'express-session' {
  interface SessionData {
    bcsc?: IdpSessionData;
    idir?: IdpSessionData;
    oidcState?: string;
    oidcCodeVerifier?: string;
    oidcIdpType?: string;
    returnTo?: string;
  }
}
