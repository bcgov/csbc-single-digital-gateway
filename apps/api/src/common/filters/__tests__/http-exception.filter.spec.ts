import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { HttpExceptionFilter } from '../http-exception.filter';

function createMockHost() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/test' }),
      getResponse: () => ({}),
      getNext: jest.fn(),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let superCatchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    superCatchSpy = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => {});
    filter = new HttpExceptionFilter();
  });

  it('Should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('Should delegate standard HttpException to super.catch', () => {
    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    const host = createMockHost();

    filter.catch(exception, host as never);

    expect(superCatchSpy).toHaveBeenCalledWith(exception, host);
  });

  it('Should log ZodSerializationException and delegate to super.catch', () => {
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        path: ['field'],
        message: 'Expected string, received number',
      },
    ]);
    const exception = new ZodSerializationException(zodError);
    const host = createMockHost();

    filter.catch(exception, host as never);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ZodSerializationException:'),
    );
    expect(superCatchSpy).toHaveBeenCalledWith(exception, host);

    loggerErrorSpy.mockRestore();
  });

  it('Should not log when ZodSerializationException contains a non-ZodError', () => {
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const fakeZodError = new Error('not a real ZodError');
    const exception = new ZodSerializationException(
      fakeZodError as unknown as ZodError,
    );
    const host = createMockHost();

    // Override getZodError so it returns a plain Error, not a ZodError instance
    jest
      .spyOn(exception, 'getZodError')
      .mockReturnValue(fakeZodError as unknown as ZodError);

    filter.catch(exception, host as never);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(superCatchSpy).toHaveBeenCalledWith(exception, host);

    loggerErrorSpy.mockRestore();
  });
});
