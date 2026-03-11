import { Inject } from '@nestjs/common';
import { DATABASE } from '../database.constants';

export const InjectDb = () => Inject(DATABASE);
