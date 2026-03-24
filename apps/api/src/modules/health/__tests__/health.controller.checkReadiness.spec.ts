/* eslint-disable @typescript-eslint/unbound-method */
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorFunction,
  HealthIndicatorResult,
  HealthIndicatorService,
  HealthIndicatorStatus,
  HttpHealthIndicator,
  TerminusModule,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DatabaseProvider } from 'src/modules/database/providers/database.provider';
import { Schema } from '../../../../../../packages/db/dist/client';
import { HealthController } from '../controllers/health.controller';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

describe('HealthController.checkReadiness', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let configService: jest.Mocked<ConfigService<any, true>>;
  let drizzle: jest.Mocked<DrizzleHealthIndicator>;
  let http: jest.Mocked<HttpHealthIndicator>;
  let db: jest.Mocked<NodePgDatabase<Schema>>;
  const configURI = 'https://example.com/jwks';

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService<any, true>>;
    drizzle = {
      isHealthy: jest.fn(),
    } as unknown as jest.Mocked<DrizzleHealthIndicator>;
    http = {
      pingCheck: jest.fn(),
    } as unknown as jest.Mocked<HttpHealthIndicator>;
    db = {} as unknown as jest.Mocked<NodePgDatabase<Schema>>;
    healthCheckService = {
      check: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        DatabaseProvider,
        HealthIndicatorService,
        { provide: ConfigService, useValue: configService },
        { provide: DrizzleHealthIndicator, useValue: drizzle },
        { provide: HttpHealthIndicator, useValue: http },
        { provide: NodePgDatabase<Schema>, useValue: db },
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should expect the health controller to be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should return health check result as an array of anonymous functions when healthCheckService.check resolves a successful check', async () => {
    const mockResult = { status: 'ok', details: {} } as HealthCheckResult;
    healthCheckService.check.mockResolvedValue(mockResult);

    await controller.checkReadiness();

    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(healthCheckService.check).toHaveBeenCalledWith([
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('Should have called configService.get with the correct keys when healthCheckService.check resolves health indicator functions', async () => {
    configService.get.mockReturnValue(configURI);
    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'ok',
          details: {} as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    await controller.checkReadiness();

    const spyConfigServiceGet = jest.spyOn(configService, 'get');
    expect(spyConfigServiceGet).toHaveBeenCalledTimes(7);
    expect(spyConfigServiceGet).toHaveBeenCalledWith('DB_NAME');
    expect(spyConfigServiceGet).toHaveBeenCalledWith('DB_HOST');
    expect(spyConfigServiceGet).toHaveBeenCalledWith('DB_PORT');
    expect(spyConfigServiceGet).toHaveBeenCalledWith('DB_USER');
    expect(spyConfigServiceGet).toHaveBeenCalledWith('DB_PASS');
    expect(spyConfigServiceGet).toHaveBeenCalledWith('DB_SSL');
    expect(spyConfigServiceGet).toHaveBeenCalledWith('OIDC_JWKS_URI');
  });

  it('Should have called drizzle.isHealthy with one time when database status is up', async () => {
    drizzle.isHealthy.mockResolvedValue({ database: { status: 'up' } });
    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'ok',
          details: {} as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    await controller.checkReadiness();

    expect(drizzle.isHealthy).toHaveBeenCalledTimes(1);
  });

  it('Should have called http.pingCheck with the correct configuration value when identity provider is up', async () => {
    const mockConfigValue = configURI;
    configService.get.mockReturnValue(mockConfigValue);
    http.pingCheck.mockResolvedValue({ identity_provider: { status: 'up' } });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'ok',
          details: {} as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    await controller.checkReadiness();

    expect(http.pingCheck).toHaveBeenCalledTimes(1);
    expect(http.pingCheck).toHaveBeenCalledWith(
      'identity_provider',
      mockConfigValue,
    );
  });

  it('Should return error status, down database status and up identity provider status when database status is down and identity provider status is up', async () => {
    const dataBaseStatus = {
      status: 'down' as HealthIndicatorStatus,
      error: 'Connection failed',
    };
    const identityProviderStatus = {
      status: 'up' as HealthIndicatorStatus,
    };
    drizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
    http.pingCheck.mockResolvedValue({
      identity_provider: identityProviderStatus,
    });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'error',
          details: {
            database: dataBaseStatus,
            identity_provider: identityProviderStatus,
          } as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    const result = await controller.checkReadiness();

    expect(result.status).toBe('error');
    expect(result.details.database.status).toBe('down');
    expect(result.details.identity_provider.status).toBe('up');
    expect(drizzle.isHealthy).toHaveBeenCalledTimes(1);
    expect(http.pingCheck).toHaveBeenCalledTimes(1);
  });

  it('Should return error status, up database status and down identity provider status when database status is up and identity provider is down', async () => {
    const dataBaseStatus = { status: 'up' as HealthIndicatorStatus };
    const identityProviderStatus = {
      status: 'down' as HealthIndicatorStatus,
      error: 'Ping failed',
    };
    drizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
    http.pingCheck.mockResolvedValue({
      identity_provider: identityProviderStatus,
    });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'error',
          details: {
            database: dataBaseStatus,
            identity_provider: identityProviderStatus,
          } as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    const result = await controller.checkReadiness();

    expect(result.status).toBe('error');
    expect(result.details.database.status).toBe('up');
    expect(result.details.identity_provider.status).toBe('down');
    expect(drizzle.isHealthy).toHaveBeenCalledTimes(1);
    expect(http.pingCheck).toHaveBeenCalledTimes(1);
  });

  it('Should expect config service returning invalid URI when config is null, database status is up and identity provider status is up', async () => {
    const dataBaseStatus = { status: 'up' as HealthIndicatorStatus };
    const identityProviderStatus = { status: 'up' as HealthIndicatorStatus };
    configService.get.mockReturnValue(null);
    drizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
    http.pingCheck.mockResolvedValue({
      identity_provider: identityProviderStatus,
    });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'ok',
          details: {
            database: dataBaseStatus,
            identity_provider: identityProviderStatus,
          } as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    const result = await controller.checkReadiness();

    expect(result.status).toBe('ok');
    expect(drizzle.isHealthy).toHaveBeenCalledTimes(1);
    expect(http.pingCheck).toHaveBeenCalledTimes(1);
    expect(http.pingCheck).toHaveBeenCalledWith('identity_provider', null);
  });

  it('Should handle empty config value when config is an empty string, database status is up and identity provider status is up', async () => {
    const dataBaseStatus = { status: 'up' as HealthIndicatorStatus };
    const identityProviderStatus = { status: 'up' as HealthIndicatorStatus };
    configService.get.mockReturnValue('');
    drizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
    http.pingCheck.mockResolvedValue({
      identity_provider: identityProviderStatus,
    });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'ok',
          details: {
            database: dataBaseStatus,
            identity_provider: identityProviderStatus,
          } as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    const result = await controller.checkReadiness();

    expect(result.status).toBe('ok');
    expect(http.pingCheck).toHaveBeenCalledTimes(1);
    expect(http.pingCheck).toHaveBeenCalledWith('identity_provider', '');
  });

  it('Should handle both indicators failing when config is valid, database status is down and identity provider status is down', async () => {
    const dataBaseStatus = { status: 'down' as HealthIndicatorStatus };
    const identityProviderStatus = { status: 'down' as HealthIndicatorStatus };
    configService.get.mockReturnValue(configURI);
    drizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
    http.pingCheck.mockResolvedValue({
      identity_provider: identityProviderStatus,
    });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'error',
          details: {
            database: dataBaseStatus,
            identity_provider: identityProviderStatus,
          } as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    const result = await controller.checkReadiness();

    expect(result.status).toBe('error');
    expect(result.details.database.status).toBe('down');
    expect(result.details.identity_provider.status).toBe('down');
  });

  it('Should handle http health indicator returning unexpected result when config is valid, database status is up and identity provider status is up', async () => {
    const dataBaseStatus = { status: 'up' as HealthIndicatorStatus };
    const unexpectedStatus = { status: 'up' as HealthIndicatorStatus };
    configService.get.mockReturnValue(configURI);
    drizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
    http.pingCheck.mockResolvedValue({ unexpected: unexpectedStatus });

    healthCheckService.check.mockImplementation(
      async (checks: HealthIndicatorFunction[]) => {
        await Promise.all(checks.map(async (fn) => fn()));
        return {
          status: 'error',
          details: {
            database: dataBaseStatus,
            unexpected: unexpectedStatus,
          } as HealthIndicatorResult,
        } as HealthCheckResult;
      },
    );

    const result = await controller.checkReadiness();

    expect(result.details).toHaveProperty('database');
    expect(result.details).toHaveProperty('unexpected');
  });
});
