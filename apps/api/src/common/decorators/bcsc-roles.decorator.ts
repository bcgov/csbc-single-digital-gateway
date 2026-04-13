import { applyDecorators } from '@nestjs/common';
import { IdpType } from 'src/modules/auth/types/idp';
import { RequireIdp } from './idp.decorator';
import { Roles } from './roles.decorator';

/**
 * Declares that a route requires a BCSC (citizen) session
 * AND that the authenticated user has at least one of the listed roles.
 *
 * Use for end-user facing endpoints. The roles listed here are looked
 * up against the BCSC-authenticated user only.
 */
export const BcscRoles = (...roles: string[]) =>
  applyDecorators(RequireIdp(IdpType.BCSC), Roles(...roles));
