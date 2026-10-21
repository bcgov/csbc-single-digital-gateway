import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { notificationOutbox, type Database, type NotificationOutbox } from '@repo/database';
import { OutboxRelayService } from '../../../src/notifications/outbox-relay.service';
import { backoffMs, DEFAULT_BACKOFF_BASE_MS } from '../../../src/notifications/backoff';
import type { Env } from '../../../src/config/env.schema';
import { createMockConfigService } from '../../utils/create-mock-config-service';
import { createTokenSpy } from '../../utils/create-token-spy';

describe('OutboxRelayService Unit Test Suite', () => {
  let service: OutboxRelayService;
  let mockDb: any;
  let getTokenSpy: any;
  let invalidateSpy: any;

  // Mock builder helpers
  let selectBuilder: any;
  let updateBuilder: any;
  let txMock: any;

  beforeEach(() => {
    // Spies for M2mTokenClient
    ({ getTokenSpy, invalidateSpy } = createTokenSpy(getTokenSpy, invalidateSpy));

    // Initialize mock builders
    selectBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue([]),
    };

    updateBuilder = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };

    txMock = {
      select: vi.fn().mockReturnValue(selectBuilder),
      update: vi.fn().mockReturnValue(updateBuilder),
    };

    mockDb = {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
    };

    service = new OutboxRelayService(
      mockDb as unknown as Database,
      createMockConfigService({
        NODE_ENV: 'development',
        OUTBOX_RELAY_ENABLED: true,
        OUTBOX_RELAY_INTERVAL_MS: 5000,
        OUTBOX_RELAY_BATCH_SIZE: 10,
        OUTBOX_RELAY_MAX_ATTEMPTS: 3,
      }) as unknown as ConfigService<Env, true>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('Should start interval timer if enabled and NODE_ENV is not test', () => {
      const tickSpy = vi.spyOn(service, 'tick').mockResolvedValue(undefined);

      service.onApplicationBootstrap();

      vi.advanceTimersByTime(5000);
      expect(tickSpy).toHaveBeenCalled();
    });

    it('Should not start interval timer if not enabled', () => {
      service = new OutboxRelayService(
        mockDb,
        createMockConfigService({
          OUTBOX_RELAY_ENABLED: false,
        }) as unknown as ConfigService<Env, true>,
      );

      const tickSpy = vi.spyOn(service, 'tick').mockResolvedValue(undefined);

      service.onApplicationBootstrap();

      vi.advanceTimersByTime(5000);
      expect(tickSpy).not.toHaveBeenCalled();
    });

    it('Should not start interval timer if NODE_ENV is test', () => {
      service = new OutboxRelayService(
        mockDb,
        createMockConfigService({
          NODE_ENV: 'test',
        }) as unknown as ConfigService<Env, true>,
      );

      const tickSpy = vi.spyOn(service, 'tick').mockResolvedValue(undefined);

      service.onApplicationBootstrap();

      vi.advanceTimersByTime(5000);
      expect(tickSpy).not.toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    it('Should clear timer and wait for inFlight progress', async () => {
      vi.useFakeTimers();
      service = new OutboxRelayService(
        mockDb,
        createMockConfigService({
          OUTBOX_RELAY_ENABLED: true,
          NODE_ENV: 'development',
          OUTBOX_RELAY_INTERVAL_MS: 5000,
        }) as unknown as ConfigService<Env, true>,
      );

      service.onApplicationBootstrap();

      const inFlightPromise = Promise.resolve();
      service['inFlight'] = inFlightPromise;

      await service.onApplicationShutdown();
      // Should not trigger again if timer is cleared
      vi.useRealTimers();
    });

    it('Should do nothing if timer is undefined', async () => {
      service['timer'] = undefined;
      await expect(service.onApplicationShutdown()).resolves.not.toThrow();
    });
  });

  describe('tick', () => {
    it('Should skip execution if inFlight is already defined', async () => {
      service['inFlight'] = Promise.resolve();
      const processSpy = vi.spyOn(service, 'processDueRows');

      await service.tick();

      expect(processSpy).not.toHaveBeenCalled();
    });

    it('Should execute processDueRows and set/clear inFlight', async () => {
      const processSpy = vi.spyOn(service, 'processDueRows').mockResolvedValue(2);

      await service.tick();

      expect(processSpy).toHaveBeenCalled();
      expect(service['inFlight']).toBeUndefined();
    });

    it('Should catch error and log if processDueRows fails', async () => {
      const processSpy = vi
        .spyOn(service, 'processDueRows')
        .mockRejectedValue(new Error('DB connection failed'));
      const loggerErrorSpy = vi.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await service.tick();

      expect(processSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith('outbox relay tick failed: DB connection failed');
      expect(service['inFlight']).toBeUndefined();
    });

    it('Should catch a non-Error and log unknown error', async () => {
      const processSpy = vi
        .spyOn(service, 'processDueRows')
        .mockRejectedValue('unreachable-string-error');
      const loggerErrorSpy = vi.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await service.tick();

      expect(processSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith('outbox relay tick failed: unknown error');
      expect(service['inFlight']).toBeUndefined();
    });

    it('Should log singular relayed outbox row when claimed is 1', async () => {
      vi.spyOn(service, 'processDueRows').mockResolvedValue(1);
      const loggerLogSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});

      await service.tick();

      expect(loggerLogSpy).toHaveBeenCalledWith('relayed 1 outbox row');
    });

    it('Should not log relayed rows message if claimed is 0', async () => {
      const processSpy = vi.spyOn(service, 'processDueRows').mockResolvedValue(0);
      const loggerLogSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});

      await service.tick();

      expect(processSpy).toHaveBeenCalled();
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('processDueRows', () => {
    const mockDueRows: NotificationOutbox[] = [
      {
        id: 'row-1',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        type: 'email',
        title: 'Title 1',
        body: 'Body 1',
        payload: { x: 1 },
        email: 'user1@example.com',
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
        deliveredAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('Should return 0 immediately if there are no due rows', async () => {
      selectBuilder.for.mockResolvedValue([]);

      const result = await service.processDueRows();

      expect(result).toBe(0);
      expect(txMock.select).toHaveBeenCalled();
      expect(getTokenSpy).not.toHaveBeenCalled();
    });

    it('Should deliver due rows and update to delivered status on success', async () => {
      selectBuilder.for.mockResolvedValue(mockDueRows);

      const responseMock = {
        ok: true,
        status: 201,
      } as unknown as Response;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      const result = await service.processDueRows();

      expect(result).toBe(1);
      expect(getTokenSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(
        new URL('/v1/notifications', 'http://notification.service'),
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer mocked-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            idempotencyKey: 'key-1',
            userId: 'user-1',
            type: 'email',
            title: 'Title 1',
            body: 'Body 1',
            payload: { x: 1 },
            email: 'user1@example.com',
          }),
        },
      );

      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
      expect(updateBuilder.set).toHaveBeenCalledWith({
        status: 'delivered',
        deliveredAt: expect.any(Object), // sql`now()`
        lastError: null,
      });
      expect(updateBuilder.where).toHaveBeenCalled();
    });

    it('Should increment attempts and back off nextAttemptAt on generic failure', async () => {
      selectBuilder.for.mockResolvedValue(mockDueRows);

      const responseMock = {
        ok: false,
        status: 500,
      } as unknown as Response;
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      const now = 1718000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const result = await service.processDueRows();

      expect(result).toBe(1);
      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
      expect(updateBuilder.set).toHaveBeenCalledWith({
        attempts: 1,
        lastError: 'ingestion responded 500',
        nextAttemptAt: new Date(now + backoffMs(1, DEFAULT_BACKOFF_BASE_MS)),
      });
    });

    it('Should mark row as failed when max attempts is reached', async () => {
      const mockRowAtLimit = {
        ...mockDueRows[0],
        attempts: 2, // limit is 3, so next is 3 which reaches the max attempts limit
      };
      selectBuilder.for.mockResolvedValue([mockRowAtLimit]);

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network disconnected'));

      const result = await service.processDueRows();

      expect(result).toBe(1);
      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
      expect(updateBuilder.set).toHaveBeenCalledWith({
        attempts: 3,
        lastError: 'Network disconnected',
        status: 'failed',
      });
    });

    it('Should invalidate token on 401 error', async () => {
      selectBuilder.for.mockResolvedValue(mockDueRows);

      const responseMock = {
        ok: false,
        status: 401,
      } as unknown as Response;
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await service.processDueRows();

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('Should fall back to "unknown relay error" if delivery throws a non-Error object', async () => {
      selectBuilder.for.mockResolvedValue(mockDueRows);
      vi.spyOn(globalThis, 'fetch').mockRejectedValue('unreachable-string-error');

      const result = await service.processDueRows();

      expect(result).toBe(1);
      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
      expect(updateBuilder.set).toHaveBeenCalledWith({
        attempts: 1,
        lastError: 'unknown relay error',
        nextAttemptAt: expect.any(Date),
      });
    });
  });
});
