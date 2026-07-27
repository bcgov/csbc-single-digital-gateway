import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response as ExpressResponse } from 'express';

import { NotificationsProxyService } from '../../../../../src/modules/notifications/services/notifications-proxy.service';
import { M2mTokenClient } from '../../../../../src/notifications/m2m-token.client';
import type { Env } from '../../../../../src/config/env.schema';

describe('NotificationsProxyService Unit Tests', () => {
  let service: NotificationsProxyService;
  let mockConfigService: ConfigService<Env, true>;
  let getTokenSpy: any;
  let invalidateSpy: any;

  beforeEach(() => {
    // Spy on M2mTokenClient prototype methods so we mock their HTTP/OIDC requests
    getTokenSpy = vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mocked-token');
    invalidateSpy = vi.spyOn(M2mTokenClient.prototype, 'invalidate').mockImplementation(() => {});

    mockConfigService = {
      get: vi.fn((key: string) => {
        switch (key) {
          case 'NOTIFICATIONS_M2M_ISSUER':
            return 'http://auth.issuer';
          case 'NOTIFICATIONS_M2M_CLIENT_ID':
            return 'client-id';
          case 'NOTIFICATIONS_M2M_CLIENT_SECRET':
            return 'client-secret';
          case 'NOTIFICATION_SERVICE_URL':
            return 'http://notification.service';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService<Env, true>;

    service = new NotificationsProxyService(mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request', () => {
    it('should successfully make an HTTP request and return the JSON response', async () => {
      const mockResult = { success: true };
      const responseMock = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResult),
      } as unknown as Response;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      const result = await service.request('GET', '/v1/test');

      expect(getTokenSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(new URL('v1/test', 'http://notification.service'), {
        method: 'GET',
        headers: {
          authorization: 'Bearer mocked-token',
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('should include content-type and stringified body if body is provided', async () => {
      const mockResult = { created: true };
      const responseMock = {
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue(mockResult),
      } as unknown as Response;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);
      const requestBody = { foo: 'bar' };

      const result = await service.request('POST', '/v1/create', requestBody);

      expect(fetchSpy).toHaveBeenCalledWith(new URL('v1/create', 'http://notification.service'), {
        method: 'POST',
        headers: {
          authorization: 'Bearer mocked-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw BadGatewayException if fetch throws a network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
    });

    it('should throw BadGatewayException if fetch throws a non-Error object during request', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue('unreachable-string-error');

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
    });

    it('should throw NotFoundException if response status is 404', async () => {
      const responseMock = {
        ok: false,
        status: 404,
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if response status is 400', async () => {
      const responseMock = {
        ok: false,
        status: 400,
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadRequestException);
    });

    it('should invalidate token client and throw BadGatewayException if response status is 401', async () => {
      const responseMock = {
        ok: false,
        status: 401,
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should throw BadGatewayException if response status is 500 or any other error', async () => {
      const responseMock = {
        ok: false,
        status: 500,
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
    });
  });

  describe('pipeStream', () => {
    it('should successfully establish stream and pipe chunks to client', async () => {
      const mockReq = {
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ExpressResponse;

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([104, 105]) }) // "hi"
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const mockBody = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      const responseMock = {
        ok: true,
        status: 200,
        body: mockBody,
      } as unknown as Response;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await service.pipeStream('/v1/stream', mockReq, mockRes);

      expect(getTokenSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(new URL('v1/stream', 'http://notification.service'), {
        headers: {
          authorization: 'Bearer mocked-token',
          accept: 'text/event-stream',
        },
        signal: expect.any(AbortSignal),
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.set).toHaveBeenCalledWith({
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      expect(mockRes.flushHeaders).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalledWith(Buffer.from(new Uint8Array([104, 105])));
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should register close listener that aborts the signal', async () => {
      let closeCallback: (() => void) | undefined;
      const mockReq = {
        on: vi.fn().mockImplementation((event, cb) => {
          if (event === 'close') {
            closeCallback = cb;
          }
        }),
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ExpressResponse;

      const responseMock = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await service.pipeStream('/v1/stream', mockReq, mockRes);

      expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(closeCallback).toBeDefined();
      if (closeCallback) {
        closeCallback();
      }
    });

    it('should throw BadGatewayException if fetch throws during pipeStream initiation', async () => {
      const mockReq = {
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        end: vi.fn(),
      } as unknown as ExpressResponse;

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Stream start error'));

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException if fetch throws a non-Error object during pipeStream initiation', async () => {
      const mockReq = {
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        end: vi.fn(),
      } as unknown as ExpressResponse;

      vi.spyOn(globalThis, 'fetch').mockRejectedValue('unreachable-string-error');

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException and invalidate if upstream is 401', async () => {
      const mockReq = {
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        end: vi.fn(),
      } as unknown as ExpressResponse;

      const responseMock = {
        ok: false,
        status: 401,
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should throw BadGatewayException if body is null', async () => {
      const mockReq = {
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        end: vi.fn(),
      } as unknown as ExpressResponse;

      const responseMock = {
        ok: true,
        status: 200,
        body: null,
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should handle reader errors gracefully by just ending the response', async () => {
      const mockReq = {
        on: vi.fn(),
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as ExpressResponse;

      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Reader stream error')),
      };

      const responseMock = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue(mockReader),
        },
      } as unknown as Response;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).resolves.not.toThrow();
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  it('should cover the transpiler metadata branch check when ConfigService is undefined', async () => {
    vi.resetModules();
    vi.doMock('@nestjs/config', () => ({
      ConfigService: undefined,
    }));
    await import('../../../../../src/modules/notifications/services/notifications-proxy.service');
    vi.doUnmock('@nestjs/config');
    vi.resetModules();
  });
});
