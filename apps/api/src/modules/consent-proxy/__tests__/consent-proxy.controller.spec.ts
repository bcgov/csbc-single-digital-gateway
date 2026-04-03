import { HttpService } from '@nestjs/axios';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { of, throwError } from 'rxjs';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import {
  buildMockResponse,
  mockConfigService,
} from 'tests/utils/mock.auth.controllers';
import { ConsentProxyController } from '../controllers/consent-proxy.controller';

type MockSession = {
  bcsc?: {
    accessToken?: string;
  };
  [key: string]: unknown;
};

type MockRequest = Request & {
  session?: MockSession;
};

type ProxyRequestConfig = {
  method: string;
  url: string;
  params: Record<string, unknown>;
  data: unknown;
  headers: {
    Authorization: string;
    'Content-Type': string;
  };
  validateStatus: (status: number) => boolean;
};

describe('ConsentProxyController Unit Test', () => {
  let controller: ConsentProxyController;

  const mockHttpService: {
    request: jest.Mock<unknown, [ProxyRequestConfig]>;
  } = {
    request: jest.fn<unknown, [ProxyRequestConfig]>(),
  };

  const getFirstRequestArg = (): ProxyRequestConfig => {
    const firstCall = mockHttpService.request.mock.calls[0];
    if (!firstCall) {
      throw new Error('Expected httpService.request to be called');
    }
    return firstCall[0];
  };

  const buildMockRequest = (
    overrides: Partial<{
      session: MockSession;
      path: string;
      method: string;
      query: Record<string, unknown>;
      body: unknown;
      headers: Record<string, string | undefined>;
    }> = {},
  ) =>
    ({
      session: overrides.session ?? { bcsc: { accessToken: 'token-123' } },
      path: overrides.path ?? '/v1/consent-proxy/consents',
      method: overrides.method ?? 'GET',
      query: overrides.query ?? { page: '1' },
      body: overrides.body ?? { test: true },
      headers: overrides.headers ?? { 'content-type': 'application/json' },
    }) as unknown as MockRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('https://consent.example.com');
    controller = new ConsentProxyController(
      mockHttpService as unknown as HttpService,
      mockConfigService as unknown as ConfigService<AppConfigDto, true>,
    );
  });

  it('Should validate that the method proxy is defined', () => {
    expect(controller).toHaveProperty('proxy');
  });

  it('Should throw UnauthorizedException when access token is missing', async () => {
    const req = buildMockRequest({ session: {} });
    const res = buildMockResponse();

    await expect(
      controller.proxy(req as unknown as Request, res as unknown as Response),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockHttpService.request).not.toHaveBeenCalled();
  });

  it('Should proxy request and return downstream status/data', async () => {
    const req = buildMockRequest({
      path: '/v1/consent-proxy/consents/123',
      method: 'POST',
      query: { a: '1' },
      body: { hello: 'world' },
      headers: { 'content-type': 'application/json' },
      session: { bcsc: { accessToken: 'abc-token' } },
    });
    const res = buildMockResponse();

    mockHttpService.request.mockReturnValueOnce(
      of({ status: 201, data: { ok: true } }),
    );

    await controller.proxy(
      req as unknown as Request,
      res as unknown as Response,
    );

    expect(mockHttpService.request).toHaveBeenCalledTimes(1);

    const requestArg = getFirstRequestArg();
    expect(requestArg.method).toBe('POST');
    expect(requestArg.url).toBe('https://consent.example.com/consents/123');
    expect(requestArg.params).toEqual({ a: '1' });
    expect(requestArg.data).toEqual({ hello: 'world' });
    expect(requestArg.headers).toEqual({
      Authorization: 'Bearer abc-token',
      'Content-Type': 'application/json',
    });
    expect(requestArg.validateStatus(500)).toBe(true);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('Should use default content-type when request content-type header is missing', async () => {
    const req = buildMockRequest({
      headers: {},
      session: { bcsc: { accessToken: 'abc-token' } },
    });
    const res = buildMockResponse();

    mockHttpService.request.mockReturnValueOnce(of({ status: 200, data: {} }));

    await controller.proxy(
      req as unknown as Request,
      res as unknown as Response,
    );

    const requestArg = getFirstRequestArg();
    expect(requestArg.headers['Content-Type']).toBe('application/json');
  });

  it('Should keep path unchanged when prefix does not exist', async () => {
    const req = buildMockRequest({
      path: '/other/path',
      session: { bcsc: { accessToken: 'abc-token' } },
    });
    const res = buildMockResponse();

    mockHttpService.request.mockReturnValueOnce(of({ status: 200, data: {} }));

    await controller.proxy(
      req as unknown as Request,
      res as unknown as Response,
    );

    const requestArg = getFirstRequestArg();
    expect(requestArg.url).toBe('https://consent.example.com//other/path');
  });

  it('Should log error and return 502 when downstream request fails', async () => {
    const req = buildMockRequest({
      session: { bcsc: { accessToken: 'abc-token' } },
    });
    const res = buildMockResponse();

    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    mockHttpService.request.mockReturnValueOnce(
      throwError(() => new Error('network down')),
    );

    await controller.proxy(
      req as unknown as Request,
      res as unknown as Response,
    );

    expect(loggerSpy).toHaveBeenCalledWith(
      'Consent proxy request failed',
      'network down',
    );
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Consent manager unavailable',
    });

    loggerSpy.mockRestore();
  });

  it('Should use empty baseUrl when config value is undefined', async () => {
    mockConfigService.get.mockReturnValueOnce(undefined);
    controller = new ConsentProxyController(
      mockHttpService as unknown as HttpService,
      mockConfigService as unknown as ConfigService<AppConfigDto, true>,
    );

    const req = buildMockRequest({
      path: '/v1/consent-proxy/items',
      session: { bcsc: { accessToken: 'abc-token' } },
    });
    const res = buildMockResponse();

    mockHttpService.request.mockReturnValueOnce(of({ status: 200, data: {} }));

    await controller.proxy(
      req as unknown as Request,
      res as unknown as Response,
    );

    const requestArg = getFirstRequestArg();
    expect(requestArg.url).toBe('/items');
  });
});
