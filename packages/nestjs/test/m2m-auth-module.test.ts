import { Controller, Get, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CurrentClient, M2mAuthModule, Public } from '../src/m2m-auth';
import type { M2mPrincipal as Principal, M2mTokenVerifier } from '../src/m2m-auth';

const stubVerifier: M2mTokenVerifier = {
  verify: async (token: string): Promise<Principal> => {
    if (token === 'test-token') {
      return {
        clientId: 'platform-api-m2m',
        subject: 'service-account-platform-api-m2m',
        claims: {},
      };
    }
    throw new Error('rejected');
  },
};

@Controller('probe')
class ProbeController {
  @Get()
  probe(@CurrentClient() principal: Principal | undefined): { clientId: string | undefined } {
    return { clientId: principal?.clientId };
  }

  @Public()
  @Get('open')
  open(): { open: boolean } {
    return { open: true };
  }
}

@Controller('health')
class FakeHealthController {
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({ controllers: [ProbeController, FakeHealthController] })
class ProbeModule {}

describe('M2mAuthModule (protected-by-default)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        M2mAuthModule.forRoot({
          issuer: 'http://localhost:8080/realms/sdg',
          audience: 'notification-service',
          publicPaths: ['/health'],
          verifier: stubVerifier,
        }),
        ProbeModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401s a route without a token (protected-by-default)', async () => {
    const res = await request(app.getHttpServer()).get('/probe');
    expect(res.status).toBe(401);
  });

  it('401s an invalid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Authorization', 'Bearer wrong');
    expect(res.status).toBe(401);
  });

  it('200s a valid token and injects the principal via @M2mPrincipal()', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body.clientId).toBe('platform-api-m2m');
  });

  it('lets an @Public route through without a token', async () => {
    const res = await request(app.getHttpServer()).get('/probe/open');
    expect(res.status).toBe(200);
    expect(res.body.open).toBe(true);
  });

  it('lets publicPaths routes through without a token', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
  });
});

describe('M2mAuthModule.forRootAsync', () => {
  it('builds options from a factory and still guards', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        M2mAuthModule.forRootAsync({
          useFactory: () => ({
            issuer: 'http://localhost:8080/realms/sdg',
            audience: 'notification-service',
            verifier: stubVerifier,
          }),
        }),
        ProbeModule,
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    try {
      expect((await request(app.getHttpServer()).get('/probe')).status).toBe(401);
      expect(
        (await request(app.getHttpServer()).get('/probe').set('Authorization', 'Bearer test-token'))
          .status,
      ).toBe(200);
    } finally {
      await app.close();
    }
  });
});
