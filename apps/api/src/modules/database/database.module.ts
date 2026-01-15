import { Module } from '@nestjs/common';
import {
  DefaultDatabase,
  DefaultDatabaseExports,
} from './providers/default-database.provider';

@Module({
  providers: [DefaultDatabase],
  exports: [...DefaultDatabaseExports],
})
export class DatabaseModule {}
