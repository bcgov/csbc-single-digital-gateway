import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { type Database, and, eq, schema } from '@repo/db';
import type { Request } from 'express';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';
import { UsersService } from 'src/modules/users/services/users.service';
import { OrgUnitsService } from '../services/org-units.service';

@Injectable()
export class OrgUnitAdminGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly orgUnitsService: OrgUnitsService,
    @InjectDb()
    private readonly db: Database,
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

    // Check org-unit-level admin
    const orgUnitId = request.params.id as string | undefined;
    if (!orgUnitId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Check direct membership as admin
    const membership = await this.db
      .select({ role: schema.orgUnitMembers.role })
      .from(schema.orgUnitMembers)
      .where(
        and(
          eq(schema.orgUnitMembers.orgUnitId, orgUnitId),
          eq(schema.orgUnitMembers.userId, userId),
          eq(schema.orgUnitMembers.role, 'admin'),
        ),
      )
      .limit(1);

    if (membership.length > 0) {
      return true;
    }

    // Check if admin of any ancestor org unit
    const isAncestorAdmin =
      await this.orgUnitsService.isAncestorAdmin(orgUnitId, userId);
    if (isAncestorAdmin) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
