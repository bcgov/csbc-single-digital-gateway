import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Session, type SessionData } from 'express-session';
import * as client from 'openid-client';
import { UsersService } from 'src/modules/users/services/users.service';
import {
  OIDC_PROVIDER_REGISTRY,
  type OidcProviderConfig,
  type OidcProviderRegistry,
} from '../auth.config';
import { IdpType } from '../types/idp';

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
    @Inject(OIDC_PROVIDER_REGISTRY)
    private readonly registry: OidcProviderRegistry,
    private readonly usersService: UsersService,
  ) {}

  private getProvider(idpType: IdpType): OidcProviderConfig {
    const provider = this.registry.get(idpType);
    if (!provider) {
      throw new Error(`Unknown IDP type: ${idpType}`);
    }
    return provider;
  }

  async buildAuthorizationUrl(
    idpType: IdpType,
    session: Session & Partial<SessionData>,
  ): Promise<string> {
    const provider = this.getProvider(idpType);
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    session.oidcState = state;
    session.oidcCodeVerifier = codeVerifier;
    session.oidcIdpType = idpType;

    const redirectTo = client.buildAuthorizationUrl(provider.client, {
      redirect_uri: provider.redirectUri,
      scope: provider.scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    return redirectTo.href;
  }

  async handleCallback(
    idpType: IdpType,
    requestQuery: Record<string, string>,
    session: Session & Partial<SessionData>,
  ): Promise<void> {
    const provider = this.getProvider(idpType);

    const callbackUrl = new URL(provider.redirectUri);
    for (const [key, value] of Object.entries(requestQuery)) {
      if (typeof value === 'string') {
        callbackUrl.searchParams.set(key, value);
      }
    }

    const tokens = await client.authorizationCodeGrant(
      provider.client,
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

    const userProfile: UserProfile = {
      sub: claims?.sub ?? '',
      name: claims?.name as string | undefined,
      email: claims?.email as string | undefined,
      given_name: claims?.given_name as string | undefined,
      family_name: claims?.family_name as string | undefined,
      picture: claims?.picture as string | undefined,
    };

    const { userId } = await this.usersService.syncFromOidc(
      provider.issuer,
      claims?.sub ?? '',
      claims as unknown as Record<string, unknown>,
      {
        name: claims?.display_name as string | undefined,
        email: claims?.email as string | undefined,
      },
    );

    session[idpType] = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      tokenExpiresAt: expiresAt,
      userProfile,
      userId,
    };

    delete session.oidcState;
    delete session.oidcCodeVerifier;
    delete session.oidcIdpType;
  }

  async refreshTokens(
    idpType: IdpType,
    session: Session & Partial<SessionData>,
  ): Promise<boolean> {
    const idpSession = session[idpType];
    if (!idpSession?.refreshToken) {
      return false;
    }

    const provider = this.getProvider(idpType);

    try {
      const tokens = await client.refreshTokenGrant(
        provider.client,
        idpSession.refreshToken,
      );

      const expiresAt = tokens.expiresIn()
        ? Date.now() + tokens.expiresIn()! * 1000
        : undefined;

      idpSession.accessToken = tokens.access_token;
      idpSession.tokenExpiresAt = expiresAt;

      if (tokens.refresh_token) {
        idpSession.refreshToken = tokens.refresh_token;
      }
      if (tokens.id_token) {
        idpSession.idToken = tokens.id_token;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Token refresh failed for ${idpType}`,
        (error as Error).message,
      );
      return false;
    }
  }

  buildLogoutUrl(
    idpType: IdpType,
    session: Session & Partial<SessionData>,
  ): string | null {
    const provider = this.getProvider(idpType);
    const idpSession = session[idpType];

    try {
      const params: Record<string, string> = {
        post_logout_redirect_uri: provider.postLogoutRedirectUri,
      };

      if (idpSession?.idToken) {
        params.id_token_hint = idpSession.idToken;
      }

      const redirectTo = client.buildEndSessionUrl(provider.client, params);
      return redirectTo.href;
    } catch {
      this.logger.warn(
        `Failed to build logout URL for ${idpType} — end_session_endpoint may not be configured`,
      );
      return null;
    }
  }

  getUserProfile(
    idpType: IdpType,
    session: Session & Partial<SessionData>,
  ): UserProfile | null {
    return session[idpType]?.userProfile ?? null;
  }

  isTokenExpiringSoon(
    idpType: IdpType,
    session: Session & Partial<SessionData>,
    thresholdMs = 30_000,
  ): boolean {
    const expiresAt = session[idpType]?.tokenExpiresAt;
    if (!expiresAt) {
      return false;
    }
    return expiresAt - Date.now() < thresholdMs;
  }

  hasActiveSession(
    idpType: IdpType,
    session: Session & Partial<SessionData>,
  ): boolean {
    return !!session[idpType]?.accessToken;
  }

  hasAnyActiveSession(session: Session & Partial<SessionData>): boolean {
    return (
      this.hasActiveSession(IdpType.BCSC, session) ||
      this.hasActiveSession(IdpType.IDIR, session)
    );
  }
}
