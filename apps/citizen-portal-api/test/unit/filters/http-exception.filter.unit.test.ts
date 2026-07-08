import { ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ZodSerializationException } from 'nestjs-zod';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ZodError } from 'zod';
import { HttpExceptionFilter } from '../../../src/filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let superCatchSpy: any;
  let loggerErrorSpy: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    // Spy on the BaseExceptionFilter.prototype.catch to check if super.catch is called
    superCatchSpy = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => {});
    // Spy on Logger.prototype.error to check if logs are made
    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call super.catch when a generic HttpException is caught', () => {
    const exception = new HttpException('Internal Server Error', 500);
    const mockHost = {} as ArgumentsHost;

    filter.catch(exception, mockHost);

    expect(superCatchSpy).toHaveBeenCalledWith(exception, mockHost);
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should log the error and call super.catch when ZodSerializationException is caught with a ZodError', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        input: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    const exception = new ZodSerializationException(zodError);
    const mockHost = {} as ArgumentsHost;

    filter.catch(exception, mockHost);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ZodSerializationException:'),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Expected string, received number'),
    );
    expect(superCatchSpy).toHaveBeenCalledWith(exception, mockHost);
  });

  it('should call super.catch but not log when ZodSerializationException does not contain a ZodError', () => {
    const exception = new ZodSerializationException(null);
    const mockHost = {} as ArgumentsHost;

    filter.catch(exception, mockHost);

    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(superCatchSpy).toHaveBeenCalledWith(exception, mockHost);
  });
});
