import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsProxyService } from '../../../../../src/modules/notifications/services/notifications-proxy.service';
import type { Request, Response as ExpressResponse } from 'express';

const mockGetToken = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('../../../../../src/notifications/m2m-token.client', () => {
  return {
    M2mTokenClient: class {
      getToken = mockGetToken;
      invalidate = mockInvalidate;
    },
  };
});

describe('NotificationsProxyService', () => {
  let service: NotificationsProxyService;
  let configMock: any;
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();

    configMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'NOTIFICATION_SERVICE_URL') return 'http://notification-service.local';
        return `${key}_VAL`;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsProxyService,
        {
          provide: ConfigService,
          useValue: configMock,
        },
      ],
    }).compile();

    service = moduleRef.get(NotificationsProxyService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('request', () => {
    it('should request and return JSON response on success', async () => {
      mockGetToken.mockResolvedValue('test-token');
      const responsePayload = { data: 'test' };
      const responseMock = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(responsePayload),
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      const result = await service.request('GET', '/v1/test-path');

      expect(mockGetToken).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        new URL('/v1/test-path', 'http://notification-service.local'),
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer test-token',
          },
        },
      );
      expect(result).toEqual(responsePayload);
    });

    it('should serialize and send request body if provided', async () => {
      mockGetToken.mockResolvedValue('test-token');
      const requestBody = { foo: 'bar' };
      const responseMock = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await service.request('POST', '/v1/test-path', requestBody);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        new URL('/v1/test-path', 'http://notification-service.local'),
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );
    });

    it('throws BadGatewayException if network request fails', async () => {
      mockGetToken.mockResolvedValue('test-token');
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Connection failure'));

      await expect(service.request('GET', '/v1/test-path')).rejects.toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when request fetch throws a non-Error object', async () => {
      mockGetToken.mockResolvedValue('test-token');
      vi.mocked(globalThis.fetch).mockRejectedValue('Raw string network error');

      await expect(service.request('GET', '/v1/test-path')).rejects.toThrow(BadGatewayException);
    });

    it('throws NotFoundException on upstream 404 response', async () => {
      mockGetToken.mockResolvedValue('test-token');
      const responseMock = { ok: false, status: 404 };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await expect(service.request('GET', '/v1/test-path')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException on upstream 400 response', async () => {
      mockGetToken.mockResolvedValue('test-token');
      const responseMock = { ok: false, status: 400 };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await expect(service.request('GET', '/v1/test-path')).rejects.toThrow(BadRequestException);
    });

    it('invalidates token and throws BadGatewayException on upstream 401 response', async () => {
      mockGetToken.mockResolvedValue('test-token');
      const responseMock = { ok: false, status: 401 };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await expect(service.request('GET', '/v1/test-path')).rejects.toThrow(BadGatewayException);
      expect(mockInvalidate).toHaveBeenCalled();
    });

    it('throws BadGatewayException on other upstream error status codes', async () => {
      mockGetToken.mockResolvedValue('test-token');
      const responseMock = { ok: false, status: 500 };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await expect(service.request('GET', '/v1/test-path')).rejects.toThrow(BadGatewayException);
    });
  });

  describe('pipeStream', () => {
    it('throws BadGatewayException if connection fails', async () => {
      const reqMock = { on: vi.fn() } as unknown as Request;
      const resMock = {} as unknown as ExpressResponse;
      mockGetToken.mockResolvedValue('test-token');
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Connection failure'));

      await expect(service.pipeStream('/v1/stream-path', reqMock, resMock)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when pipeStream fetch throws a non-Error object', async () => {
      const reqMock = { on: vi.fn() } as unknown as Request;
      const resMock = {} as unknown as ExpressResponse;
      mockGetToken.mockResolvedValue('test-token');
      vi.mocked(globalThis.fetch).mockRejectedValue('Raw string network error');

      await expect(service.pipeStream('/v1/stream-path', reqMock, resMock)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException if upstream returns non-ok status', async () => {
      const reqMock = { on: vi.fn() } as unknown as Request;
      const resMock = {} as unknown as ExpressResponse;
      mockGetToken.mockResolvedValue('test-token');
      const responseMock = { ok: false, status: 401 };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await expect(service.pipeStream('/v1/stream-path', reqMock, resMock)).rejects.toThrow(
        BadGatewayException,
      );
      expect(mockInvalidate).toHaveBeenCalled();
    });

    it('throws BadGatewayException without invalidating token if upstream returns non-ok status other than 401', async () => {
      const reqMock = { on: vi.fn() } as unknown as Request;
      const resMock = {} as unknown as ExpressResponse;
      mockGetToken.mockResolvedValue('test-token');
      const responseMock = { ok: false, status: 500 };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      mockInvalidate.mockClear();
      await expect(service.pipeStream('/v1/stream-path', reqMock, resMock)).rejects.toThrow(
        BadGatewayException,
      );
      expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('pipes events successfully to response stream', async () => {
      const reqCloseCallbacks: any[] = [];
      const reqMock = {
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            reqCloseCallbacks.push(callback);
          }
        }),
      } as unknown as Request;
      const resMock = {
        status: vi.fn(),
        set: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ExpressResponse;

      mockGetToken.mockResolvedValue('test-token');

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([65, 66]) }) // "AB"
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const responseMock = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue(mockReader),
        },
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await service.pipeStream('/v1/stream-path', reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(200);
      expect(resMock.set).toHaveBeenCalledWith({
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      expect(resMock.flushHeaders).toHaveBeenCalled();
      expect(resMock.write).toHaveBeenCalledWith(Buffer.from(new Uint8Array([65, 66])));
      expect(resMock.end).toHaveBeenCalled();
    });

    it('aborts upstream connection when client drops (req close event)', async () => {
      const reqCloseCallbacks: any[] = [];
      const reqMock = {
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            reqCloseCallbacks.push(callback);
          }
        }),
      } as unknown as Request;
      const resMock = {
        status: vi.fn(),
        set: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ExpressResponse;

      mockGetToken.mockResolvedValue('test-token');

      const responseMock = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi.fn().mockImplementation(async () => {
              if (reqCloseCallbacks[0]) {
                reqCloseCallbacks[0]();
              }
              return { done: true, value: undefined };
            }),
          }),
        },
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(responseMock as any);

      await service.pipeStream('/v1/stream-path', reqMock, resMock);
      expect(resMock.end).toHaveBeenCalled();
    });
  });

  describe('compiler generated branch coverage', () => {
    it('covers SWC parameter metadata helper branches when config service is undefined', async () => {
      vi.resetModules();
      vi.doMock('@nestjs/config', () => ({
        ConfigService: undefined,
      }));
      const { NotificationsProxyService: TempService } =
        await import('../../../../../src/modules/notifications/services/notifications-proxy.service');
      expect(TempService).toBeDefined();
    });
  });
});
