import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UsersService } from 'src/modules/users/services/users.service';
import { REQUIRES_OWNER_KEY } from '../decorators/requires-owner.decorator';
import { ConsentDocumentContributorsService } from '../services/consent-document-contributors.service';

@Injectable()
export class ConsentDocumentContributorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly contributorsService: ConsentDocumentContributorsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.session?.idir?.userId;

    if (!userId) {
      throw new ForbiddenException('No authenticated user');
    }

    // Global admins can access everything
    const userRoles = await this.usersService.getUserRoles(userId);
    if (userRoles.includes('admin')) {
      return true;
    }

    const docId = request.params.docId as string | undefined;
    if (!docId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const contributorRole = await this.contributorsService.getContributorRole(
      docId,
      userId,
    );

    if (!contributorRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const requiresOwner = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiresOwner && contributorRole !== 'owner') {
      throw new ForbiddenException(
        'Only document owners can perform this action',
      );
    }

    return true;
  }
}
