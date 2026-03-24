import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'openid-client';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { IdpType } from './types/idp';

export interface OidcProviderConfig {
  client: client.Configuration;
  issuer: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: string;
}

export const OIDC_PROVIDER_REGISTRY = Symbol('OIDC_PROVIDER_REGISTRY');
export type OidcProviderRegistry = Map<IdpType, OidcProviderConfig>;

function getClientAuth(
  method: string,
  clientSecret: string,
): client.ClientAuth {
  switch (method) {
    case 'client_secret_basic':
      return client.ClientSecretBasic(clientSecret);
    case 'client_secret_post':
    default:
      return client.ClientSecretPost(clientSecret);
  }
}

async function discoverIdp(
  issuerUrl: string,
  clientId: string,
  clientSecret: string,
  authMethod: string,
  redirectUri: string,
  postLogoutRedirectUri: string,
  label: string,
  logger: Logger,
): Promise<OidcProviderConfig> {
  const clientAuth = getClientAuth(authMethod, clientSecret);
  const config = await client.discovery(
    new URL(issuerUrl),
    clientId,
    undefined,
    clientAuth,
  );

  logger.log(`OIDC discovery completed for ${label}: ${issuerUrl}`);

  return {
    client: config,
    issuer: issuerUrl,
    redirectUri,
    postLogoutRedirectUri,
    scopes: 'openid profile email',
  };
}

export const oidcProviderRegistryProvider = {
  provide: OIDC_PROVIDER_REGISTRY,
  useFactory: async (
    configService: ConfigService<AppConfigDto, true>,
  ): Promise<OidcProviderRegistry> => {
    const logger = new Logger('OidcProviderRegistry');

    const [bcsc, idir] = await Promise.all([
      discoverIdp(
        configService.get('OIDC_ISSUER'),
        configService.get('OIDC_CLIENT_ID'),
        configService.get('OIDC_CLIENT_SECRET'),
        configService.get('OIDC_CLIENT_AUTH_METHOD'),
        configService.get('OIDC_REDIRECT_URI'),
        configService.get('OIDC_POST_LOGOUT_REDIRECT_URI'),
        'BCSC',
        logger,
      ),
      discoverIdp(
        configService.get('AUTH_OIDC_ISSUER'),
        configService.get('AUTH_OIDC_CLIENT_ID'),
        configService.get('AUTH_OIDC_CLIENT_SECRET'),
        configService.get('AUTH_OIDC_CLIENT_AUTH_METHOD'),
        configService.get('AUTH_OIDC_REDIRECT_URI'),
        configService.get('AUTH_OIDC_POST_LOGOUT_REDIRECT_URI'),
        'IDIR',
        logger,
      ),
    ]);

    const registry: OidcProviderRegistry = new Map();
    registry.set(IdpType.BCSC, bcsc);
    registry.set(IdpType.IDIR, idir);

    return registry;
  },
  inject: [ConfigService],
};
