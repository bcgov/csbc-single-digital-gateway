import { SetMetadata } from '@nestjs/common';

export const REQUIRES_OWNER_KEY = Symbol('REQUIRES_OWNER');
export const RequiresOwner = () => SetMetadata(REQUIRES_OWNER_KEY, true);
