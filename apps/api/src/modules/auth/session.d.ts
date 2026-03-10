import type { UserProfile } from './services/auth.service';

declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    tokenExpiresAt?: number;
    userProfile?: UserProfile;
    oidcState?: string;
    oidcCodeVerifier?: string;
    returnTo?: string;
  }
}
