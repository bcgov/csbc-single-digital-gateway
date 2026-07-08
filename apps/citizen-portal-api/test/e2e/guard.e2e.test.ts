import { Controller, Get, Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthModule, CurrentUser, Public, Roles } from '@repo/nestjs/auth';
import type { AuthModuleOptions, AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

@Controller('probe')
class ProbeController {
  @Get('me') // protected-by-default
  me(@CurrentUser() user?: AuthUser): AuthUser | null {
    return user ?? null;
  }

  @Public()
  @Get('open')
  open(): { ok: true } {
    return { ok: true };
  }

  @Roles('admin')
  @Get('admin')
  admin(): { admin: true } {
    return { admin: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

const authOptions = {
  issuer: 'https://idp.example.com',
  clientId: 'c',
  clientSecret: 's',
  redirectUri: 'http://localhost:4000/auth/callback',
  postLoginRedirect: 'http://localhost:3000/app',
  session: { secret: 'a-long-enough-session-secret' },
  publicPaths: [],
  config: {} as unknown as NonNullable<AuthModuleOptions['config']>,
} satisfies AuthModuleOptions;

const seedUser = (roles: string[]): string =>
  JSON.stringify({ id: 'u', roles, claims: { sub: 'u' } } satisfies AuthUser);

describe('global AuthGuard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.forRoot(authOptions), ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // Simulate a logged-in session: seed req.session.authUser from a test header (no real OIDC).
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const header = req.headers['x-test-user'];
      if (typeof header === 'string') {
        (req as unknown as { session: { authUser?: AuthUser } }).session = {
          authUser: JSON.parse(header) as AuthUser,
        };
      }
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('protected route 401s without a session', async () => {
    expect((await http().get('/probe/me')).status).toBe(401);
  });

  it('protected route 200s with a session and @CurrentUser resolves it', async () => {
    const res = await http().get('/probe/me').set('x-test-user', seedUser([]));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('u');
  });

  it('@Public route is reachable without a session', async () => {
    expect((await http().get('/probe/open')).status).toBe(200);
  });

  it('@Roles route 403s a non-admin', async () => {
    expect((await http().get('/probe/admin').set('x-test-user', seedUser([]))).status).toBe(403);
  });

  it('@Roles route 200s an admin', async () => {
    expect(
      (
        await http()
          .get('/probe/admin')
          .set('x-test-user', seedUser(['admin']))
      ).status,
    ).toBe(200);
  });
});
