import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsProxyService } from '../../../../../src/modules/notifications/services/notifications-proxy.service';
import { M2mTokenClient } from '../../../../../src/notifications/m2m-token.client';
import type { Env } from '../../../../../src/config/env.schema';
import { createMockConfigService } from '../../../../utils/createMockConfigService';
import { createMockResponse } from '../../../../utils/createMockResponse';
import { createMockReq } from '../../../../utils/createMockReq';
import { createMockRes } from '../../../../utils/createMockRes';

describe('NotificationsProxyService Unit Test Suite', () => {
  let service: NotificationsProxyService;
  let getTokenSpy: any;
  let invalidateSpy: any;

  beforeEach(() => {
    // Spy on M2mTokenClient prototype methods so we mock their HTTP/OIDC requests
    getTokenSpy = vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mocked-token');
    invalidateSpy = vi.spyOn(M2mTokenClient.prototype, 'invalidate').mockImplementation(() => {});
    service = new NotificationsProxyService(
      createMockConfigService() as unknown as ConfigService<Env, true>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request', () => {
    it('Should successfully make an HTTP request and return the JSON response', async () => {
      const mockResult = { success: true };
      const responseMock = createMockResponse({
        json: vi.fn().mockResolvedValue(mockResult),
      });

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

    it('Should include content-type and stringified body if body is provided', async () => {
      const mockResult = { created: true };
      const responseMock = createMockResponse({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue(mockResult),
      });

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

    it('Should throw BadGatewayException if fetch throws a network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
    });

    it('Should throw BadGatewayException if fetch throws a non-Error object during request', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue('unreachable-string-error');

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
    });

    it('Should throw NotFoundException if response status is 404', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 404,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(NotFoundException);
    });

    it('Should throw BadRequestException if response status is 400', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 400,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadRequestException);
    });

    it('Should invalidate token client and throw BadGatewayException if response status is 401', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 401,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('Should throw BadGatewayException if response status is 500 or any other error', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 500,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(BadGatewayException);
    });

    it('Should throw UnprocessableEntityException with upstream message if status is 422 and json has message string', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({ message: 'Custom validation error' }),
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(
        new UnprocessableEntityException('Custom validation error'),
      );
    });

    it('Should throw UnprocessableEntityException with fallback message if status is 422 and json lacks message string', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({ error: 'Some other key' }),
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(
        new UnprocessableEntityException('Invalid notifications request'),
      );
    });

    it('Should throw UnprocessableEntityException with fallback message if status is 422 and json throws/fails', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 422,
        json: vi.fn().mockRejectedValue(new Error('JSON parse error')),
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(
        new UnprocessableEntityException('Invalid notifications request'),
      );
    });

    it('Should throw UnprocessableEntityException with fallback message if status is 422 and json is null/non-object', async () => {
      const responseMock = createMockResponse({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue(null),
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.request('GET', '/v1/test')).rejects.toThrow(
        new UnprocessableEntityException('Invalid notifications request'),
      );
    });
  });

  describe('pipeStream', () => {
    it('Should successfully establish stream and pipe chunks to client', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([104, 105]) }) // "hi"
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const mockBody = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      const responseMock = createMockResponse({
        ok: true,
        status: 200,
        body: mockBody,
      });

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

    it('Should register close listener that aborts the signal', async () => {
      let closeCallback: (() => void) | undefined;
      const mockReq = createMockReq({
        on: vi.fn().mockImplementation((event, cb) => {
          if (event === 'close') {
            closeCallback = cb;
          }
        }),
      });

      const mockRes = createMockRes();

      const responseMock = createMockResponse({
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await service.pipeStream('/v1/stream', mockReq, mockRes);

      expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(closeCallback).toBeDefined();
      if (closeCallback) {
        closeCallback();
      }
    });

    it('Should throw BadGatewayException if fetch throws during pipeStream initiation', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Stream start error'));

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('Should throw BadGatewayException if fetch throws a non-Error object during pipeStream initiation', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();

      vi.spyOn(globalThis, 'fetch').mockRejectedValue('unreachable-string-error');

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('Should throw BadGatewayException and invalidate if upstream is 401', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();

      const responseMock = createMockResponse({
        ok: false,
        status: 401,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('Should throw BadGatewayException if body is null', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();

      const responseMock = createMockResponse({
        ok: true,
        status: 200,
        body: null,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('Should handle reader errors gracefully by just ending the response', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();

      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Reader stream error')),
      };

      const responseMock = createMockResponse({
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue(mockReader),
        },
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

      await expect(service.pipeStream('/v1/stream', mockReq, mockRes)).resolves.not.toThrow();
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  it('Should cover the transpiler metadata branch check when ConfigService is undefined', async () => {
    vi.resetModules();
    vi.doMock('@nestjs/config', () => ({
      ConfigService: undefined,
    }));
    await import('../../../../../src/modules/notifications/services/notifications-proxy.service');
    vi.doUnmock('@nestjs/config');
    vi.resetModules();
  });
});
