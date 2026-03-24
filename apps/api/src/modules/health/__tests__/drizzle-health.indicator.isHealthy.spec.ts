/* eslint-disable @typescript-eslint/unbound-method */
import { HealthIndicatorService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { QueryResult } from 'pg';
import { Schema } from '../../../../../../packages/db/dist/client';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

describe('DrizzleHealthIndicator.isHealthy', () => {
  let drizzleHealthIndicator: DrizzleHealthIndicator;
  let healthIndicatorService: jest.Mocked<HealthIndicatorService>;
  let db: jest.Mocked<NodePgDatabase<Schema>>;

  beforeEach(async () => {
    const mockIndicator = {
      up: jest.fn(),
      down: jest.fn(),
    };

    healthIndicatorService = {
      check: jest.fn().mockReturnValue(mockIndicator),
    } as unknown as jest.Mocked<HealthIndicatorService>;

    db = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<NodePgDatabase<Schema>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrizzleHealthIndicator,
        { provide: HealthIndicatorService, useValue: healthIndicatorService },
      ],
    }).compile();

    drizzleHealthIndicator = module.get<DrizzleHealthIndicator>(
      DrizzleHealthIndicator,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should return up result when db.execute succeeds', async () => {
    const upResult = { status: 'ok', details: {} };
    (healthIndicatorService.check('test').up as jest.Mock).mockReturnValue(
      upResult,
    );
    db.execute.mockResolvedValue(undefined as unknown as QueryResult);

    const result = await drizzleHealthIndicator.isHealthy('test', db);

    expect(result).toEqual(upResult);
    expect(healthIndicatorService.check).toHaveBeenCalledWith('test');
    expect(healthIndicatorService.check('test').up).toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalledWith(sql`SELECT 1`);
  });

  it('Should return down result when db.execute fails with error status', async () => {
    const downResult = { status: 'error', details: { message: 'Error' } };
    (healthIndicatorService.check('test').down as jest.Mock).mockReturnValue(
      downResult,
    );
    db.execute.mockRejectedValue(new Error('DB error'));

    const result = await drizzleHealthIndicator.isHealthy('test', db);

    expect(healthIndicatorService.check).toHaveBeenCalledWith('test');
    expect(db.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    expect(healthIndicatorService.check('test').down).toHaveBeenCalledWith({
      message: 'Error',
    });
    expect(result).toEqual(downResult);
  });

  it('Should handle empty key when db.execute succeeds', async () => {
    const upResult = { status: 'ok', details: {} };
    (healthIndicatorService.check('').up as jest.Mock).mockReturnValue(
      upResult,
    );
    db.execute.mockResolvedValue(undefined as unknown as QueryResult);

    const result = await drizzleHealthIndicator.isHealthy('', db);

    expect(healthIndicatorService.check).toHaveBeenCalledWith('');
    expect(result).toEqual(upResult);
  });

  it('Should handle null key when db.execute succeeds', async () => {
    const upResult = { status: 'ok', details: {} };
    (healthIndicatorService.check(null as any).up as jest.Mock).mockReturnValue(
      upResult,
    );
    db.execute.mockResolvedValue(undefined as unknown as QueryResult);

    const result = await drizzleHealthIndicator.isHealthy(null as never, db);

    expect(healthIndicatorService.check).toHaveBeenCalledWith(null);
    expect(result).toEqual(upResult);
  });

  it('Should handle undefined key when db.execute succeeds', async () => {
    const upResult = { status: 'ok', details: {} };
    (
      healthIndicatorService.check(undefined as any).up as jest.Mock
    ).mockReturnValue(upResult);
    db.execute.mockResolvedValue(undefined as unknown as QueryResult);

    const result = await drizzleHealthIndicator.isHealthy(
      undefined as never,
      db,
    );

    expect(healthIndicatorService.check).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(upResult);
  });

  it('Should handle null db when db.execute succeeds', async () => {
    const downResult = { status: 'error', details: { message: 'Error' } };
    (healthIndicatorService.check('test').down as jest.Mock).mockReturnValue(
      downResult,
    );

    const result = await drizzleHealthIndicator.isHealthy(
      'test',
      null as never,
    );

    expect(healthIndicatorService.check).toHaveBeenCalledWith('test');
    expect(healthIndicatorService.check('test').down).toHaveBeenCalledWith({
      message: 'Error',
    });
    expect(result).toEqual(downResult);
  });

  it('Should handle undefined db when db.execute succeeds', async () => {
    const downResult = { status: 'error', details: { message: 'Error' } };
    (healthIndicatorService.check('test').down as jest.Mock).mockReturnValue(
      downResult,
    );

    const result = await drizzleHealthIndicator.isHealthy(
      'test',
      undefined as never,
    );

    expect(healthIndicatorService.check).toHaveBeenCalledWith('test');
    expect(healthIndicatorService.check('test').down).toHaveBeenCalledWith({
      message: 'Error',
    });
    expect(result).toEqual(downResult);
  });

  it('Should handle healthIndicatorService.check throwing error', async () => {
    healthIndicatorService.check.mockImplementation(() => {
      throw new Error('Check failed');
    });

    await expect(drizzleHealthIndicator.isHealthy('test', db)).rejects.toThrow(
      'Check failed',
    );
  });

  it('Should handle up() throwing error when db.execute resolves to undefined', async () => {
    (healthIndicatorService.check('test').up as jest.Mock).mockImplementation(
      () => {
        throw new Error('Up failed');
      },
    );
    db.execute.mockResolvedValue(undefined as unknown as QueryResult);

    const result = await drizzleHealthIndicator.isHealthy('test', db);

    expect(healthIndicatorService.check).toHaveBeenCalledWith('test');
    expect(result).toBeUndefined();
  });

  it('Should handle down() throwing error when db.execute rejects with error', async () => {
    (healthIndicatorService.check('test').down as jest.Mock).mockImplementation(
      () => {
        throw new Error('Down failed');
      },
    );
    db.execute.mockRejectedValue(new Error('DB error'));

    await expect(drizzleHealthIndicator.isHealthy('test', db)).rejects.toThrow(
      'Down failed',
    );
  });

  it('Should handle db.execute returning unexpected value when db.execute resolves to unexpected value', async () => {
    const upResult = { status: 'ok', details: {} };
    (healthIndicatorService.check('test').up as jest.Mock).mockReturnValue(
      upResult,
    );
    db.execute.mockResolvedValue('unexpected' as unknown as QueryResult);

    const result = await drizzleHealthIndicator.isHealthy('test', db);

    expect(result).toEqual(upResult);
  });
});
