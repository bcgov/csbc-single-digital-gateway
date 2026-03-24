/* eslint-disable @typescript-eslint/unbound-method */
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorService,
  TerminusModule,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { DatabaseProvider } from 'src/modules/database/providers/database.provider';
import { HealthController } from '../controllers/health.controller';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

describe('HealthController.checkLiveliness', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        ConfigService<AppConfigDto, true>,
        DatabaseProvider,
        DrizzleHealthIndicator,
        HealthIndicatorService,
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

  it('Should return health check result when healthCheckService.check resolves a successful check', async () => {
    const mockResult = { status: 'ok', details: {} } as HealthCheckResult;
    healthCheckService.check.mockResolvedValue(mockResult);

    const result = await controller.checkLiveliness();

    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(healthCheckService.check).toHaveBeenCalledWith([]);
    expect(result).toEqual(mockResult);
  });

  it('Should throw a rejection when healthCheckService.check rejects with an error', async () => {
    const error = new Error('database down');
    healthCheckService.check.mockRejectedValue(error);

    await expect(controller.checkLiveliness()).rejects.toThrow('database down');

    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(healthCheckService.check).toHaveBeenCalledWith([]);
  });

  it('Should return null when healthCheckService.check resolves null', async () => {
    const mockResult = null as unknown as HealthCheckResult;
    healthCheckService.check.mockResolvedValue(mockResult);

    const result = await controller.checkLiveliness();

    expect(result).toBeNull();
  });

  it('Should return undefined when healthCheckService.check resolves undefined', async () => {
    const mockResult = undefined as unknown as HealthCheckResult;
    healthCheckService.check.mockResolvedValue(mockResult);

    const result = await controller.checkLiveliness();

    expect(result).toBeUndefined();
  });

  it('Should support primitive return values from healthCheckService.check', async () => {
    const mockResult = 'up' as unknown as HealthCheckResult;
    healthCheckService.check.mockResolvedValue(mockResult);

    const result = await controller.checkLiveliness();

    expect(result).toBe(mockResult);
  });

  it('Should handle multiple concurrent calls safely when called simultaneously', async () => {
    const mockResult = { status: 'ok', details: {} } as HealthCheckResult;
    healthCheckService.check.mockResolvedValue(mockResult);

    const [r1, r2] = await Promise.all([
      controller.checkLiveliness(),
      controller.checkLiveliness(),
    ]);

    expect(r1).toEqual(mockResult);
    expect(r2).toEqual(mockResult);
    expect(healthCheckService.check).toHaveBeenCalledTimes(2);
  });
});
