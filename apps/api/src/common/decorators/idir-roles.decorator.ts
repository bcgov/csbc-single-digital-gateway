import { applyDecorators } from '@nestjs/common';
import { IdpType } from 'src/modules/auth/types/idp';
import { RequireIdp } from './idp.decorator';
import { Roles } from './roles.decorator';

/**
 * Declares that a route requires an IDIR (internal staff) session
 * AND that the authenticated user has at least one of the listed roles.
 *
 * Use for staff-facing admin endpoints. The roles listed here are looked
 * up against the IDIR-authenticated user only.
 */
export const IdirRoles = (...roles: string[]) =>
  applyDecorators(RequireIdp(IdpType.IDIR), Roles(...roles));
