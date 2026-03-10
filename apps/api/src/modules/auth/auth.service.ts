import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Session, type SessionData } from 'express-session';
import * as client from 'openid-client';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { OIDC_CLIENT, type OidcClient } from './auth.config';

export interface UserProfile {
  sub: string;
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(OIDC_CLIENT)
    private readonly oidcClient: OidcClient,
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {}

  async buildAuthorizationUrl(
    session: Session & Partial<SessionData>,
  ): Promise<string> {
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    session.oidcState = state;
    session.oidcCodeVerifier = codeVerifier;

    const redirectTo = client.buildAuthorizationUrl(this.oidcClient, {
      redirect_uri: this.configService.get('OIDC_REDIRECT_URI'),
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    return redirectTo.href;
  }

  async handleCallback(
    callbackUrl: URL,
    session: Session & Partial<SessionData>,
  ): Promise<void> {
    const tokens = await client.authorizationCodeGrant(
      this.oidcClient,
      callbackUrl,
      {
        pkceCodeVerifier: session.oidcCodeVerifier,
        expectedState: session.oidcState,
      },
    );

    const claims = tokens.claims();
    const expiresAt = tokens.expiresIn()
      ? Date.now() + tokens.expiresIn()! * 1000
      : undefined;

    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.idToken = tokens.id_token;
    session.tokenExpiresAt = expiresAt;
    session.userProfile = {
      sub: claims?.sub ?? '',
      name: claims?.name as string | undefined,
      email: claims?.email as string | undefined,
      given_name: claims?.given_name as string | undefined,
      family_name: claims?.family_name as string | undefined,
      picture: claims?.picture as string | undefined,
    };

    delete session.oidcState;
    delete session.oidcCodeVerifier;
  }

  async refreshTokens(
    session: Session & Partial<SessionData>,
  ): Promise<boolean> {
    if (!session.refreshToken) {
      return false;
    }

    try {
      const tokens = await client.refreshTokenGrant(
        this.oidcClient,
        session.refreshToken,
      );

      const expiresAt = tokens.expiresIn()
        ? Date.now() + tokens.expiresIn()! * 1000
        : undefined;

      session.accessToken = tokens.access_token;
      session.tokenExpiresAt = expiresAt;

      if (tokens.refresh_token) {
        session.refreshToken = tokens.refresh_token;
      }
      if (tokens.id_token) {
        session.idToken = tokens.id_token;
      }

      return true;
    } catch (error) {
      this.logger.warn('Token refresh failed', (error as Error).message);
      return false;
    }
  }

  buildLogoutUrl(session: Session & Partial<SessionData>): string | null {
    try {
      const params: Record<string, string> = {
        post_logout_redirect_uri: this.configService.get(
          'OIDC_POST_LOGOUT_REDIRECT_URI',
        ),
      };

      if (session.idToken) {
        params.id_token_hint = session.idToken;
      }

      const redirectTo = client.buildEndSessionUrl(this.oidcClient, params);
      return redirectTo.href;
    } catch {
      this.logger.warn(
        'Failed to build logout URL — end_session_endpoint may not be configured',
      );
      return null;
    }
  }

  getUserProfile(session: Session & Partial<SessionData>): UserProfile | null {
    return session.userProfile ?? null;
  }

  isTokenExpiringSoon(
    session: Session & Partial<SessionData>,
    thresholdMs = 30_000,
  ): boolean {
    if (!session.tokenExpiresAt) {
      return false;
    }
    return session.tokenExpiresAt - Date.now() < thresholdMs;
  }
}
