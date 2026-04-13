import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IdpType } from 'src/modules/auth/types/idp';
import { UsersService } from 'src/modules/users/services/users.service';
import { IDP_KEY } from '../decorators/idp.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      string[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const requiredIdp = this.reflector.getAllAndOverride<IdpType | undefined>(
      IDP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredIdp) {
      // Roles without an IDP declaration is an authorization configuration bug.
      // Fail closed rather than guess which session to trust.
      throw new ForbiddenException(
        'Route declares roles but no IDP — use @IdirRoles or @BcscRoles',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.session?.[requiredIdp]?.userId;

    if (!userId) {
      throw new ForbiddenException(
        `No authenticated ${requiredIdp.toUpperCase()} user`,
      );
    }

    const userRoles = await this.usersService.getUserRoles(userId);
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
