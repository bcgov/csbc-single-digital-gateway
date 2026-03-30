import { INestApplication } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorService,
  TerminusModule,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import * as http from 'node:http';
import { AppHealthModule } from 'src/modules/app-health.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { HealthController } from 'src/modules/health/controllers/health.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { DrizzleHealthIndicator } from 'src/modules/health/indicators/drizzle-health.indicator';
import request from 'supertest';

describe('HealthController - Integration Tests', () => {
  let app: INestApplication;
  let server: http.Server;
  const mockHealthCheckService = { check: jest.fn() };
  const healthLiveEndpoint = '/health/live';
  const healthReadyEndpoint = '/health/ready';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppHealthModule, DatabaseModule, HealthModule, TerminusModule],
      controllers: [HealthController],
      providers: [
        DrizzleHealthIndicator,
        HealthIndicatorService,
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    server = app.getHttpServer() as http.Server;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('@Get("live")', () => {
    it('should return 200 with status ok when all checks pass', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: {},
      });

      const response = await request(server)
        .get(healthLiveEndpoint)
        .expect(200);

      expect(response.body).toMatchObject({ status: 'ok' });
    });

    it('should return 500 when health check throws', async () => {
      mockHealthCheckService.check.mockRejectedValue({
        status: 'error',
        details: { liveness: { status: 'down' } },
      });

      const response = await request(server)
        .get(healthLiveEndpoint)
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Internal server error',
        statusCode: 500,
      });
    });

    it('should be a public route and not require authentication', async () => {
      await request(server)
        .get(healthLiveEndpoint)
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        });
    });

    it('should return consistent results across multiple concurrent requests', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: {},
      });

      const [r1, r2, r3] = await Promise.all([
        request(server).get(healthLiveEndpoint),
        request(server).get(healthLiveEndpoint),
        request(server).get(healthLiveEndpoint),
      ]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r3.status).toBe(200);
      expect(r1.body).toMatchObject({ status: 'ok' });
      expect(r2.body).toMatchObject({ status: 'ok' });
      expect(r3.body).toMatchObject({ status: 'ok' });
    });
  });

  describe("@Get('ready')", () => {
    it('should return 200 with status ok when both database and identity provider are healthy', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: {
          database: { status: 'up' },
          identity_provider: { status: 'up' },
        },
      });

      const response = await request(server)
        .get(healthReadyEndpoint)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        details: {
          database: { status: 'up' },
          identity_provider: { status: 'up' },
        },
      });
    });

    it('should return 500 when database is down', async () => {
      mockHealthCheckService.check.mockRejectedValue({
        status: 'error',
        details: {
          database: { status: 'down' },
          identity_provider: { status: 'up' },
        },
      });

      const response = await request(server)
        .get(healthReadyEndpoint)
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Internal server error',
        statusCode: 500,
      });
    });

    it('should return 500 when identity provider is down', async () => {
      mockHealthCheckService.check.mockRejectedValue({
        status: 'error',
        details: {
          database: { status: 'up' },
          identity_provider: { status: 'down' },
        },
      });

      const response = await request(server)
        .get(healthReadyEndpoint)
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Internal server error',
        statusCode: 500,
      });
    });

    it('should return 500 when both database and identity provider are down', async () => {
      mockHealthCheckService.check.mockRejectedValue({
        status: 'error',
        details: {
          database: { status: 'down' },
          identity_provider: { status: 'down' },
        },
      });

      const response = await request(server)
        .get(healthReadyEndpoint)
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Internal server error',
        statusCode: 500,
      });
    });

    it('should be a public route and not require authentication', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: {},
      });

      await request(server)
        .get(healthReadyEndpoint)
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        });
    });

    it('should call healthCheckService.check with drizzle and http indicator functions', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: {},
      });

      await request(server).get(healthReadyEndpoint).expect(200);

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return consistent results across multiple concurrent requests', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: {
          database: { status: 'up' },
          identity_provider: { status: 'up' },
        },
      });

      const [r1, r2, r3] = await Promise.all([
        request(server).get(healthReadyEndpoint),
        request(server).get(healthReadyEndpoint),
        request(server).get(healthReadyEndpoint),
      ]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r3.status).toBe(200);
      expect(r1.body).toMatchObject({ status: 'ok' });
      expect(r2.body).toMatchObject({ status: 'ok' });
      expect(r3.body).toMatchObject({ status: 'ok' });
    });
  });
});
