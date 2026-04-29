import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import { Logger } from 'nestjs-pino';
import { AppConfigDto } from './common/dtos/app-config.dto';
import { AppHealthModule } from './modules/app-health.module';
import { AppModule } from './modules/app.module';

async function bootstrapMain() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService: ConfigService<AppConfigDto, true> =
    app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.enableVersioning();

  // Trust proxy for secure cookies behind reverse proxy
  app.set('trust proxy', 1);

  // CORS with credentials
  const nodeEnv = configService.get<string>('NODE_ENV');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const testerIPAddress = configService.get<string>('TESTER_IP_ADDRESS');

  app.enableCors({
    origin:
      nodeEnv === 'development' ? [frontendUrl, testerIPAddress] : frontendUrl,
    credentials: true,
  });

  // Cookie parser
  app.use(cookieParser());

  // Session middleware with PostgreSQL store
  const PgSession = connectPgSimple(session);
  const sessionSecret = configService.get<string>('SESSION_SECRET');

  app.use(
    session({
      store: new PgSession({
        conString: `postgresql://${configService.get('DB_USER')}:${configService.get('DB_PASS')}@${configService.get('DB_HOST')}:${configService.get('DB_PORT')}/${configService.get('DB_NAME')}${configService.get('DB_SSL') ? '?sslmode=require' : ''}`,
        createTableIfMissing: false,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      },
    }),
  );

  // CSRF protection (Double Submit Cookie)
  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => sessionSecret,
    getSessionIdentifier: (req) => req.session?.id ?? '',
    cookieName: 'csrf-token',
    cookieOptions: {
      httpOnly: false, // Frontend must read this cookie
      secure: nodeEnv === 'production',
      sameSite: 'lax',
    },
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });

  // Generate CSRF token on all responses so the frontend can read the cookie
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      generateCsrfToken(req, res);
    }
    next();
  });

  // Apply CSRF protection (skip safe methods and /auth/callback)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
      req.path === '/auth/callback'
    ) {
      return next();
    }
    doubleCsrfProtection(req, res, next);
  });

  const port = configService.get<number>('PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`API server listening on http://0.0.0.0:${port}`);
}

async function bootstrapHealth() {
  const app = await NestFactory.create(AppHealthModule, { bufferLogs: true });
  const configService = app.get(ConfigService<AppConfigDto, true>);
  const logger = app.get(Logger);

  app.useLogger(logger);

  const port = configService.get<number>('HEALTH_PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`Health check server listening on http://0.0.0.0:${port}`);
}

void (async () => {
  await bootstrapMain();
  await bootstrapHealth();
})();
