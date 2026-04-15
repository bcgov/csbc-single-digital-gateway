import { ConfigService } from '@nestjs/config';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorFunction,
  HealthIndicatorResult,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { Database } from '@repo/db';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { mockConfigService } from 'tests/utils/mock.auth.controllers';
import { HealthController } from '../controllers/health.controller';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

describe('HealthController Unit Test', () => {
  let controller: HealthController;
  const mockDb = {} as Database;
  const mockDrizzle = { isHealthy: jest.fn() };
  const mockHealthCheckService = { check: jest.fn() };
  const mockHttp = { pingCheck: jest.fn() };
  const configURI = 'https://example.com/jwks';

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController(
      mockConfigService as unknown as ConfigService<AppConfigDto, true>,
      mockDb as unknown as Database,
      mockDrizzle as unknown as DrizzleHealthIndicator,
      mockHealthCheckService as unknown as HealthCheckService,
      mockHttp as unknown as HttpHealthIndicator,
    );
  });

  describe('CheckLiveliness', () => {
    it('Should validate that the method checkLiveliness is defined', () => {
      const spyCheckLiveliness = jest.spyOn(controller, 'checkLiveliness');
      expect(spyCheckLiveliness).toBeDefined();
    });

    it('Should return health check result when mockHealthCheckService.check resolves a successful check', async () => {
      const mockResult = { status: 'ok', details: {} };
      mockHealthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkLiveliness();

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([]);
      expect(result).toEqual(mockResult);
    });

    it('Should throw a rejection when mockHealthCheckService.check rejects with an error', async () => {
      const error = new Error('database down');
      mockHealthCheckService.check.mockRejectedValue(error);

      await expect(controller.checkLiveliness()).rejects.toThrow(
        'database down',
      );

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([]);
    });

    it('Should return null when mockHealthCheckService.check resolves null', async () => {
      const mockResult = null;
      mockHealthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkLiveliness();

      expect(result).toBeNull();
    });

    it('Should return undefined when mockHealthCheckService.check resolves undefined', async () => {
      const mockResult = undefined;
      mockHealthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkLiveliness();

      expect(result).toBeUndefined();
    });

    it('Should support primitive return values from mockHealthCheckService.check', async () => {
      const mockResult = 'up';
      mockHealthCheckService.check.mockResolvedValue(mockResult);

      const result = await controller.checkLiveliness();

      expect(result).toBe(mockResult);
    });

    it('Should handle multiple concurrent calls safely when called simultaneously', async () => {
      const mockResult = { status: 'ok', details: {} };
      mockHealthCheckService.check.mockResolvedValue(mockResult);

      const [r1, r2] = await Promise.all([
        controller.checkLiveliness(),
        controller.checkLiveliness(),
      ]);

      expect(r1).toEqual(mockResult);
      expect(r2).toEqual(mockResult);
      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(2);
    });
  });

  describe('CheckReadiness', () => {
    it('Should validate that the method checkReadiness is defined', () => {
      const spyCheckReadiness = jest.spyOn(controller, 'checkReadiness');
      expect(spyCheckReadiness).toBeDefined();
    });

    it('Should return health check result as an array of anonymous functions when mockHealthCheckService.check resolves a successful check', async () => {
      const mockResult = { status: 'ok', details: {} };
      mockHealthCheckService.check.mockResolvedValue(mockResult);

      await controller.checkReadiness();

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('Should have called mockConfigService.get with the correct keys when mockHealthCheckService.check resolves health indicator functions', async () => {
      mockConfigService.get.mockReturnValue(configURI);
      mockHealthCheckService.check.mockImplementation(
        async (checks: HealthIndicatorFunction[]) => {
          await Promise.all(checks.map(async (fn) => fn()));
          return {
            status: 'ok',
            details: {} as HealthIndicatorResult,
          } as HealthCheckResult;
        },
      );

      await controller.checkReadiness();

      const spyConfigServiceGet = jest.spyOn(mockConfigService, 'get');
      expect(spyConfigServiceGet).toHaveBeenCalledTimes(1);
      expect(spyConfigServiceGet).toHaveBeenCalledWith('OIDC_ISSUER');
    });

    it('Should have called mockDrizzle.isHealthy with one time when database status is up', async () => {
      mockDrizzle.isHealthy.mockResolvedValue({ database: { status: 'up' } });
      mockHealthCheckService.check.mockImplementation(
        async (checks: HealthIndicatorFunction[]) => {
          await Promise.all(checks.map(async (fn) => fn()));
          return {
            status: 'ok',
            details: {} as HealthIndicatorResult,
          } as HealthCheckResult;
        },
      );

      await controller.checkReadiness();

      expect(mockDrizzle.isHealthy).toHaveBeenCalledTimes(1);
    });

    it('Should have called mockHttp.pingCheck with the correct configuration value when identity provider is up', async () => {
      const mockConfigValue = configURI;
      mockConfigService.get.mockReturnValue(mockConfigValue);
      mockHttp.pingCheck.mockResolvedValue({
        identity_provider: { status: 'up' },
      });

      mockHealthCheckService.check.mockImplementation(
        async (checks: HealthIndicatorFunction[]) => {
          await Promise.all(checks.map(async (fn) => fn()));
          return {
            status: 'ok',
            details: {} as HealthIndicatorResult,
          } as HealthCheckResult;
        },
      );

      await controller.checkReadiness();

      expect(mockHttp.pingCheck).toHaveBeenCalledTimes(1);
      expect(mockHttp.pingCheck).toHaveBeenCalledWith(
        'identity_provider',
        `${mockConfigValue}/.well-known/openid-configuration`,
      );
    });

    it('Should return error status, down database status and up identity provider status when database status is down and identity provider status is up', async () => {
      const dataBaseStatus = {
        status: 'down',
        error: 'Connection failed',
      };
      const identityProviderStatus = {
        status: 'up',
      };
      mockDrizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
      mockHttp.pingCheck.mockResolvedValue({
        identity_provider: identityProviderStatus,
      });

      mockHealthCheckService.check.mockImplementation(
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
      expect(mockDrizzle.isHealthy).toHaveBeenCalledTimes(1);
      expect(mockHttp.pingCheck).toHaveBeenCalledTimes(1);
    });

    it('Should return error status, up database status and down identity provider status when database status is up and identity provider is down', async () => {
      const dataBaseStatus = { status: 'up' };
      const identityProviderStatus = { status: 'down', error: 'Ping failed' };
      mockDrizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
      mockHttp.pingCheck.mockResolvedValue({
        identity_provider: identityProviderStatus,
      });

      mockHealthCheckService.check.mockImplementation(
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
      expect(mockDrizzle.isHealthy).toHaveBeenCalledTimes(1);
      expect(mockHttp.pingCheck).toHaveBeenCalledTimes(1);
    });

    it('Should expect config service returning invalid URI when config is null, database status is up and identity provider status is up', async () => {
      const dataBaseStatus = { status: 'up' };
      const identityProviderStatus = { status: 'up' };
      mockConfigService.get.mockReturnValue(null);
      mockDrizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
      mockHttp.pingCheck.mockResolvedValue({
        identity_provider: identityProviderStatus,
      });

      mockHealthCheckService.check.mockImplementation(
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
      expect(mockDrizzle.isHealthy).toHaveBeenCalledTimes(1);
      expect(mockHttp.pingCheck).toHaveBeenCalledTimes(1);
      expect(mockHttp.pingCheck).toHaveBeenCalledWith(
        'identity_provider',
        'null/.well-known/openid-configuration',
      );
    });

    it('Should handle empty config value when config is an empty string, database status is up and identity provider status is up', async () => {
      const dataBaseStatus = { status: 'up' };
      const identityProviderStatus = { status: 'up' };
      mockConfigService.get.mockReturnValue('');
      mockDrizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
      mockHttp.pingCheck.mockResolvedValue({
        identity_provider: identityProviderStatus,
      });

      mockHealthCheckService.check.mockImplementation(
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
      expect(mockHttp.pingCheck).toHaveBeenCalledTimes(1);
      expect(mockHttp.pingCheck).toHaveBeenCalledWith(
        'identity_provider',
        '/.well-known/openid-configuration',
      );
    });

    it('Should handle both indicators failing when config is valid, database status is down and identity provider status is down', async () => {
      const dataBaseStatus = { status: 'down' };
      const identityProviderStatus = { status: 'down' };
      mockConfigService.get.mockReturnValue(configURI);
      mockDrizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
      mockHttp.pingCheck.mockResolvedValue({
        identity_provider: identityProviderStatus,
      });

      mockHealthCheckService.check.mockImplementation(
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
      const dataBaseStatus = { status: 'up' };
      const unexpectedStatus = { status: 'up' };
      mockConfigService.get.mockReturnValue(configURI);
      mockDrizzle.isHealthy.mockResolvedValue({ database: dataBaseStatus });
      mockHttp.pingCheck.mockResolvedValue({ unexpected: unexpectedStatus });

      mockHealthCheckService.check.mockImplementation(
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
});
