import { Inject } from '@nestjs/common';
import { DEFAULT_DB } from '../database.constants';

export const InjectDefaultDb = () => Inject(DEFAULT_DB);
