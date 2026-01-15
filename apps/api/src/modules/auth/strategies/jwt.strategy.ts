import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        handleSigningKeyError: (error) => {
          if (error) this.logger.error(error.message);
        },
        cache: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get('OIDC_JWKS_URI'),
        rateLimit: true,
      }),
      algorithms: ['RS256'],
      audience: ['account'],
      issuer: configService.get('OIDC_ISSUER'),
    });
  }

  validate(payload: unknown): unknown {
    return payload;
  }
}
