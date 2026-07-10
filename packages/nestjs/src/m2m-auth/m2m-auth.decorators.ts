import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { M2mPrincipal } from './m2m-auth.types';

// Public opt-out is ONE concept package-wide: m2m-auth honours the same metadata key the
// session AuthGuard does, so `@Public()` means "no auth" under either guard.
export { IS_PUBLIC_KEY, Public } from '../auth/auth.decorators';

/** Factory behind {@link CurrentClient}: the M2mPrincipal the guard attached to the request. */
export function currentClient(_data: unknown, ctx: ExecutionContext): M2mPrincipal | undefined {
  return ctx.switchToHttp().getRequest<Request>().m2mPrincipal;
}

/** Inject the verified machine caller (undefined on a public route with no token). */
export const CurrentClient = createParamDecorator(currentClient);
