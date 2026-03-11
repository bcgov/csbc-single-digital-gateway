import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase } from '@repo/db';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { DATABASE } from '../database.constants';

export const DatabaseProvider: FactoryProvider = {
  provide: DATABASE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AppConfigDto, true>) => {
    return createDatabase({
      DB_NAME: configService.get('DB_NAME'),
      DB_HOST: configService.get('DB_HOST'),
      DB_PORT: configService.get('DB_PORT'),
      DB_USER: configService.get('DB_USER'),
      DB_PASS: configService.get('DB_PASS'),
      DB_SSL: configService.get('DB_SSL'),
    });
  },
};

export const DatabaseExports = [DATABASE];
