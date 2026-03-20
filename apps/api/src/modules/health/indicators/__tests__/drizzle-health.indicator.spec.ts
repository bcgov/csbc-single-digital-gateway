import { HealthIndicatorService } from '@nestjs/terminus';
import { DrizzleHealthIndicator } from '../drizzle-health.indicator';

describe('DrizzleHealthIndicator', () => {
  let indicator: DrizzleHealthIndicator;
  const mockUp = jest.fn().mockReturnValue({ database: { status: 'up' } });
  const mockDown = jest
    .fn()
    .mockReturnValue({ database: { status: 'down', message: 'Error' } });
  const mockHealthIndicatorService = {
    check: jest.fn().mockReturnValue({ up: mockUp, down: mockDown }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    indicator = new DrizzleHealthIndicator(
      mockHealthIndicatorService as unknown as HealthIndicatorService,
    );
  });

  it('Should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('Should return up when database responds', async () => {
    const mockDb = { execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const result = await indicator.isHealthy('database', mockDb as never);
    expect(result).toEqual({ database: { status: 'up' } });
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it('Should return down when database fails', async () => {
    const mockDb = {
      execute: jest.fn().mockRejectedValue(new Error('connection refused')),
    };
    const result = await indicator.isHealthy('database', mockDb as never);
    expect(result).toEqual({
      database: { status: 'down', message: 'Error' },
    });
  });
});
