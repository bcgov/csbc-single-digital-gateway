import { SetMetadata } from '@nestjs/common';
import { IdpType } from 'src/modules/auth/types/idp';

export const IDP_KEY = Symbol('REQUIRED_IDP');

/**
 * Declares which identity provider a route requires.
 *
 * Authorization in this codebase is split across two distinct trust domains:
 *  - IDIR  → internal staff (admin/staff/org-admin roles)
 *  - BCSC  → citizens (user role)
 *
 * Every protected route must declare its IDP explicitly. There is no
 * fallback or path-based inference. Routes that should be unauthenticated
 * must instead use `@PublicRoute()`.
 */
export const RequireIdp = (idp: IdpType) => SetMetadata(IDP_KEY, idp);
