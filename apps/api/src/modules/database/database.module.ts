import { Module } from '@nestjs/common';
import {
  DatabaseProvider,
  DatabaseExports,
} from './providers/database.provider';

@Module({
  providers: [DatabaseProvider],
  exports: [...DatabaseExports],
})
export class DatabaseModule {}
