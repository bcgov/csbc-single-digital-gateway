import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppConfigDto, AppConfigSchema } from 'src/common/dtos/app-config.dto';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { AuthModule } from './auth/auth.module';
import { JwtGuard } from './auth/guards/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config: Record<string, any>) => AppConfigSchema.parse(config),
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService<AppConfigDto, true>) => {
        return {
          pinoHttp: {
            level:
              configService.get('NODE_ENV') !== 'production' ? 'debug' : 'info',
            transport:
              configService.get('NODE_ENV') !== 'production'
                ? { target: 'pino-pretty' }
                : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
