import { ValueProvider } from '@nestjs/common';
import { defaultDb } from 'src/database/default';
import { DEFAULT_DB } from '../database.constants';

export const DefaultDatabase: ValueProvider = {
  provide: DEFAULT_DB,
  useValue: defaultDb,
};

export const DefaultDatabaseExports = [DEFAULT_DB];
