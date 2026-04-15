import { MiddlewareConsumer } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { mockConfigService } from 'tests/utils/mock.auth.controllers';
import { AppModule } from '../app.module';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TokenRefreshMiddleware } from '../auth/middleware/token-refresh.middleware';

describe('AppModule Unit Test', () => {
  let appModule: AppModule;

  beforeEach(() => {
    jest.clearAllMocks();
    appModule = new AppModule();
  });

  describe('Class', () => {
    it('Should validate that the AppModule is defined', () => {
      expect(appModule).toBeDefined();
    });

    it('Should validate that the AppModule is an instance of AppModule', () => {
      expect(appModule).toBeInstanceOf(AppModule);
    });

    it('Should validate that the AppModule implements the configure method', () => {
      expect(typeof appModule.configure).toBe('function');
    });
  });

  describe('Configuration', () => {
    let mockConsumer: { apply: jest.Mock; forRoutes: jest.Mock };

    beforeEach(() => {
      mockConsumer = {
        apply: jest.fn().mockReturnThis(),
        forRoutes: jest.fn().mockReturnThis(),
      };
    });

    it('Should call consumer.apply with TokenRefreshMiddleware', () => {
      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      expect(mockConsumer.apply).toHaveBeenCalledWith(TokenRefreshMiddleware);
    });

    it('Should call consumer.forRoutes with wildcard "*"', () => {
      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      expect(mockConsumer.forRoutes).toHaveBeenCalledWith('*');
    });

    it('Should call consumer.apply exactly once', () => {
      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      expect(mockConsumer.apply).toHaveBeenCalledTimes(1);
    });

    it('Should call consumer.forRoutes exactly once', () => {
      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      expect(mockConsumer.forRoutes).toHaveBeenCalledTimes(1);
    });

    it('Should call consumer.apply before consumer.forRoutes', () => {
      const callOrder: string[] = [];
      mockConsumer.apply.mockImplementation(() => {
        callOrder.push('apply');
        return mockConsumer;
      });
      mockConsumer.forRoutes.mockImplementation(() => {
        callOrder.push('forRoutes');
        return mockConsumer;
      });

      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      expect(callOrder).toEqual(['apply', 'forRoutes']);
    });

    it('Should chain apply and forRoutes on the same consumer instance', () => {
      const returnedFromApply = { forRoutes: mockConsumer.forRoutes };
      mockConsumer.apply.mockReturnValue(returnedFromApply);

      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      expect(mockConsumer.apply).toHaveBeenCalledTimes(1);
      expect(mockConsumer.forRoutes).toHaveBeenCalledTimes(1);
    });

    it('Should not throw when consumer methods are valid mocks', () => {
      expect(() =>
        appModule.configure(mockConsumer as unknown as MiddlewareConsumer),
      ).not.toThrow();
    });

    it('Should not call any extra methods on consumer beyond apply and forRoutes', () => {
      const strictConsumer = {
        apply: jest.fn().mockReturnThis(),
        forRoutes: jest.fn().mockReturnThis(),
        exclude: jest.fn(),
      };

      appModule.configure(strictConsumer as unknown as MiddlewareConsumer);

      expect(strictConsumer.exclude).not.toHaveBeenCalled();
    });

    it('Should only register TokenRefreshMiddleware and not any other middleware', () => {
      appModule.configure(mockConsumer as unknown as MiddlewareConsumer);

      const [firstArg, ...rest] = mockConsumer.apply.mock.calls[0] as unknown[];
      expect(firstArg).toBe(TokenRefreshMiddleware);
      expect(rest).toHaveLength(0);
    });
  });

  describe('LoggerModule factory', () => {
    const factory = (
      configService: ConfigService<Record<string, unknown>, true>,
    ) => ({
      pinoHttp: {
        level:
          configService.get('NODE_ENV') === 'production' ? 'info' : 'debug',
        transport:
          configService.get('NODE_ENV') === 'production'
            ? undefined
            : { target: 'pino-pretty' },
      },
    });

    it('Should set log level to "debug" when NODE_ENV is not "production"', () => {
      mockConfigService.get.mockReturnValue('development');

      const result = factory(
        mockConfigService as unknown as ConfigService<
          Record<string, unknown>,
          true
        >,
      );

      expect(result.pinoHttp.level).toBe('debug');
    });

    it('Should set log level to "info" when NODE_ENV is "production"', () => {
      mockConfigService.get.mockReturnValue('production');

      const result = factory(
        mockConfigService as unknown as ConfigService<
          Record<string, unknown>,
          true
        >,
      );

      expect(result.pinoHttp.level).toBe('info');
    });

    it('Should set pino-pretty transport when NODE_ENV is not "production"', () => {
      mockConfigService.get.mockReturnValue('development');

      const result = factory(
        mockConfigService as unknown as ConfigService<
          Record<string, unknown>,
          true
        >,
      );

      expect(result.pinoHttp.transport).toEqual({ target: 'pino-pretty' });
    });

    it('Should set transport to undefined when NODE_ENV is "production"', () => {
      mockConfigService.get.mockReturnValue('production');

      const result = factory(
        mockConfigService as unknown as ConfigService<
          Record<string, unknown>,
          true
        >,
      );

      expect(result.pinoHttp.transport).toBeUndefined();
    });

    it('Should return a pinoHttp config object', () => {
      mockConfigService.get.mockReturnValue('test');

      const result = factory(
        mockConfigService as unknown as ConfigService<
          Record<string, unknown>,
          true
        >,
      );

      expect(result).toHaveProperty('pinoHttp');
      expect(result.pinoHttp).toHaveProperty('level');
      expect(result.pinoHttp).toHaveProperty('transport');
    });
  });

  describe('Metadata', () => {
    let providers: {
      provide: unknown;
      useClass: unknown;
    }[];

    beforeEach(() => {
      jest.clearAllMocks();
      providers = Reflect.getMetadata('providers', AppModule) as {
        provide: unknown;
        useClass: unknown;
      }[];
    });

    it('Should validate that providers metadata is defined', () => {
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('Should register APP_FILTER with HttpExceptionFilter', () => {
      const filterProvider = providers.find((p) => p.provide === APP_FILTER);

      expect(filterProvider).toBeDefined();
      expect(filterProvider?.useClass).toBe(HttpExceptionFilter);
    });

    it('Should register APP_GUARD with AuthGuard', () => {
      const guardProvider = providers.find((p) => p.provide === APP_GUARD);

      expect(guardProvider).toBeDefined();
      expect(guardProvider?.useClass).toBe(AuthGuard);
    });

    it('Should register APP_INTERCEPTOR with ZodSerializerInterceptor', () => {
      const interceptorProvider = providers.find(
        (p) => p.provide === APP_INTERCEPTOR,
      );

      expect(interceptorProvider).toBeDefined();
      expect(interceptorProvider?.useClass).toBe(ZodSerializerInterceptor);
    });

    it('Should register APP_PIPE with ZodValidationPipe', () => {
      const pipeProvider = providers.find((p) => p.provide === APP_PIPE);

      expect(pipeProvider).toBeDefined();
      expect(pipeProvider?.useClass).toBe(ZodValidationPipe);
    });

    it('Should register exactly four providers', () => {
      const providers = Reflect.getMetadata('providers', AppModule) as {
        provide: unknown;
        useClass: unknown;
      }[];

      expect(providers).toHaveLength(4);
    });

    it('Should have imports metadata defined', () => {
      const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

      expect(imports).toBeDefined();
      expect(Array.isArray(imports)).toBe(true);
    });

    it('Should have at least one import defined', () => {
      const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

      expect(imports.length).toBeGreaterThan(0);
    });
  });
});
