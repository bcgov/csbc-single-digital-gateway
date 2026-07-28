import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OutboxRelayService } from '../../../src/notifications/outbox-relay.service';
import { M2mTokenClient } from '../../../src/notifications/m2m-token.client';
import { notificationOutbox } from '@repo/database';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    for: vi.fn().mockResolvedValue(resolvedValue),
    where: vi.fn().mockReturnThis(),
  });
};

describe('OutboxRelayService', () => {
  let service: OutboxRelayService;
  let dbMock: any;
  let txMock: any;
  let configMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();

    txMock = {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    dbMock = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
    };

    configMock = {
      get: vi.fn().mockImplementation((key) => {
        if (key === 'OUTBOX_RELAY_ENABLED') return true;
        if (key === 'NODE_ENV') return 'development';
        if (key === 'OUTBOX_RELAY_INTERVAL_MS') return 5000;
        if (key === 'OUTBOX_RELAY_BATCH_SIZE') return 10;
        if (key === 'OUTBOX_RELAY_MAX_ATTEMPTS') return 3;
        if (key === 'NOTIFICATION_SERVICE_URL') return 'https://notifications.example.com';
        return '';
      }),
    };

    service = new OutboxRelayService(dbMock, configMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('onApplicationBootstrap', () => {
    it('does not start timer if relay is disabled', () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'OUTBOX_RELAY_ENABLED') return false;
        return '';
      });
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      service.onApplicationBootstrap();

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('does not start timer if NODE_ENV is test', () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'OUTBOX_RELAY_ENABLED') return true;
        if (key === 'NODE_ENV') return 'test';
        return '';
      });
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      service.onApplicationBootstrap();

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('starts timer interval if enabled', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      service.onApplicationBootstrap();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      service.onApplicationShutdown();
    });

    it('triggers tick timer interval and processes tick when time advances', async () => {
      const processSpy = vi.spyOn(service, 'processDueRows').mockResolvedValue(0);
      service.onApplicationBootstrap();

      await vi.advanceTimersByTimeAsync(5000);

      expect(processSpy).toHaveBeenCalled();
      service.onApplicationShutdown();
    });

    it('cleans up shut down when timer is undefined', async () => {
      await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
    });
  });

  describe('tick', () => {
    it('does not run processDueRows concurrently if inFlight is active', async () => {
      txMock.select.mockImplementation(() => new Promise(() => {})); // never resolves
      void service.tick(); // sets inFlight

      const processSpy = vi.spyOn(service, 'processDueRows');
      await service.tick();

      expect(processSpy).not.toHaveBeenCalled();
    });

    it('logs relayed count when greater than 1 (plural form)', async () => {
      vi.spyOn(service, 'processDueRows').mockResolvedValue(2);
      const loggerSpy = vi.spyOn((service as any).logger, 'log');

      await service.tick();

      expect(loggerSpy).toHaveBeenCalledWith('relayed 2 outbox rows');
    });

    it('logs relayed count when exactly 1 (singular form)', async () => {
      vi.spyOn(service, 'processDueRows').mockResolvedValue(1);
      const loggerSpy = vi.spyOn((service as any).logger, 'log');

      await service.tick();

      expect(loggerSpy).toHaveBeenCalledWith('relayed 1 outbox row');
    });

    it('logs nothing when claimed count is 0', async () => {
      vi.spyOn(service, 'processDueRows').mockResolvedValue(0);
      const loggerSpy = vi.spyOn((service as any).logger, 'log');

      await service.tick();

      expect(loggerSpy).not.toHaveBeenCalledWith(expect.stringContaining('relayed'));
    });

    it('logs tick failure with unknown error message when rejected with non-Error', async () => {
      vi.spyOn(service, 'processDueRows').mockRejectedValue('Raw string tick error');
      const loggerSpy = vi.spyOn((service as any).logger, 'error');

      await service.tick();

      expect(loggerSpy).toHaveBeenCalledWith('outbox relay tick failed: unknown error');
    });
  });

  describe('processDueRows', () => {
    it('returns 0 if no due rows found', async () => {
      txMock.select.mockImplementation(() => mockQuery([]));

      const count = await service.processDueRows();

      expect(count).toBe(0);
    });

    it('claims due rows and delivers them successfully', async () => {
      const mockRow = {
        id: 'outbox-1',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        type: 'email',
        title: 'Title',
        body: 'Body',
        payload: null,
        email: 'user@example.com',
        attempts: 0,
      };
      txMock.select.mockImplementation(() => mockQuery([mockRow]));

      vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mock-token');
      const fetchResponse = { ok: true, status: 200 };
      vi.mocked(fetch).mockResolvedValue(fetchResponse as any);

      const count = await service.processDueRows();

      expect(count).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        new URL('https://notifications.example.com/v1/notifications'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            authorization: 'Bearer mock-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            idempotencyKey: 'key-1',
            userId: 'user-1',
            type: 'email',
            title: 'Title',
            body: 'Body',
            email: 'user@example.com',
          }),
        }),
      );
      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
    });

    it('handles 401 response and invalidates token client cache', async () => {
      const mockRow = {
        id: 'outbox-1',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        type: 'email',
        title: 'Title',
        body: null,
        payload: null,
        email: 'user@example.com',
        attempts: 0,
      };
      txMock.select.mockImplementation(() => mockQuery([mockRow]));

      vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mock-token');
      const invalidateSpy = vi.spyOn(M2mTokenClient.prototype, 'invalidate');

      const fetchResponse = { ok: false, status: 401 };
      vi.mocked(fetch).mockResolvedValue(fetchResponse as any);

      await service.processDueRows();

      expect(invalidateSpy).toHaveBeenCalled();
      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox); // updates attempt and errors
    });

    it('marks row as terminal failed when attempts exceed limit', async () => {
      const mockRow = {
        id: 'outbox-1',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        type: 'email',
        title: 'Title',
        body: null,
        payload: null,
        email: 'user@example.com',
        attempts: 2, // will become 3 (exceeding/reaching limit of 3)
      };
      txMock.select.mockImplementation(() => mockQuery([mockRow]));

      vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mock-token');
      const fetchResponse = { ok: false, status: 500 };
      vi.mocked(fetch).mockResolvedValue(fetchResponse as any);

      await service.processDueRows();

      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
      expect(txMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 3,
          status: 'failed',
        }),
      );
    });

    it('claims due rows with payload and delivers them successfully', async () => {
      const mockRow = {
        id: 'outbox-1',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        type: 'email',
        title: 'Title',
        body: null,
        payload: { key: 'value' },
        email: 'user@example.com',
        attempts: 0,
      };
      txMock.select.mockImplementation(() => mockQuery([mockRow]));

      vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mock-token');
      const fetchResponse = { ok: true, status: 200 };
      vi.mocked(fetch).mockResolvedValue(fetchResponse as any);

      await service.processDueRows();

      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({
            idempotencyKey: 'key-1',
            userId: 'user-1',
            type: 'email',
            title: 'Title',
            payload: { key: 'value' },
            email: 'user@example.com',
          }),
        }),
      );
    });

    it('handles non-Error delivery failures in deliverOne', async () => {
      const mockRow = {
        id: 'outbox-1',
        idempotencyKey: 'key-1',
        userId: 'user-1',
        type: 'email',
        title: 'Title',
        body: null,
        payload: null,
        email: null,
        attempts: 0,
      };
      txMock.select.mockImplementation(() => mockQuery([mockRow]));

      vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mock-token');
      vi.mocked(fetch).mockRejectedValue('Raw string fetch error');

      await service.processDueRows();

      expect(txMock.update).toHaveBeenCalledWith(notificationOutbox);
      expect(txMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 1,
          lastError: 'unknown relay error',
        }),
      );
    });
  });
});
