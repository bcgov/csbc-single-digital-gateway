import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'openid-client';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';

export const OIDC_CLIENT = Symbol('OIDC_CLIENT');

export type OidcClient = client.Configuration;

export const oidcClientProvider = {
  provide: OIDC_CLIENT,
  useFactory: async (
    configService: ConfigService<AppConfigDto, true>,
  ): Promise<OidcClient> => {
    const logger = new Logger('OidcClientProvider');
    const issuer = configService.get('OIDC_ISSUER');
    const clientId = configService.get('OIDC_CLIENT_ID');
    const clientSecret = configService.get('OIDC_CLIENT_SECRET');

    const config = await client.discovery(
      new URL(issuer),
      clientId,
      undefined,
      client.ClientSecretPost(clientSecret),
    );

    logger.log(`OIDC discovery completed for issuer: ${issuer}`);
    return config;
  },
  inject: [ConfigService],
};
