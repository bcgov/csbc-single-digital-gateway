import { Injectable, Logger } from '@nestjs/common';
import { and, type Database, eq, ilike, notExists, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  async syncFromOidc(
    issuer: string,
    sub: string,
    claims: Record<string, unknown>,
    profile: { name?: string; email?: string },
  ): Promise<{ userId: string }> {
    const existing = await this.db
      .select({ userId: schema.identities.userId })
      .from(schema.identities)
      .where(
        and(
          eq(schema.identities.issuer, issuer),
          eq(schema.identities.sub, sub),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].userId) {
      await this.db
        .update(schema.identities)
        .set({ claims })
        .where(
          and(
            eq(schema.identities.issuer, issuer),
            eq(schema.identities.sub, sub),
          ),
        );

      this.logger.debug(
        `Updated identity claims for user ${existing[0].userId}`,
      );
      return { userId: existing[0].userId };
    }

    const result = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          name: profile.name,
          email: profile.email,
        })
        .returning({ id: schema.users.id });

      const role =
        claims.identity_provider === 'azureidir' ? 'staff' : 'citizen';

      await Promise.all([
        tx.insert(schema.identities).values({
          userId: user.id,
          issuer,
          sub,
          claims,
        }),
        tx.insert(schema.userRoles).values({
          userId: user.id,
          role,
        }),
      ]);

      return { userId: user.id };
    });

    this.logger.log(`Created new user ${result.userId} for ${issuer}/${sub}`);
    return result;
  }

  async searchStaffUsers(
    q: string,
    excludeOrgUnitId: string,
    limit: number,
  ) {
    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      })
      .from(schema.users)
      .innerJoin(
        schema.userRoles,
        eq(schema.userRoles.userId, schema.users.id),
      )
      .where(
        and(
          eq(schema.userRoles.role, 'staff'),
          ilike(schema.users.name, `%${q}%`),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(schema.orgUnitMembers)
              .where(
                and(
                  eq(schema.orgUnitMembers.userId, schema.users.id),
                  eq(schema.orgUnitMembers.orgUnitId, excludeOrgUnitId),
                ),
              ),
          ),
        ),
      )
      .limit(limit);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ role: schema.userRoles.role })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));

    return rows.map((r) => r.role);
  }
}
