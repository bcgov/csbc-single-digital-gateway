import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, eq, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

@Injectable()
export class ServiceContributorsService {
  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  async findByService(serviceId: string) {
    return this.db
      .select({
        userId: schema.serviceContributors.userId,
        role: schema.serviceContributors.role,
        name: schema.users.name,
        email: schema.users.email,
        createdAt: schema.serviceContributors.createdAt,
      })
      .from(schema.serviceContributors)
      .innerJoin(
        schema.users,
        eq(schema.serviceContributors.userId, schema.users.id),
      )
      .where(
        eq(schema.serviceContributors.serviceId, serviceId),
      );
  }

  async addContributor(
    serviceId: string,
    userId: string,
    role: 'owner',
  ) {
    try {
      const [result] = await this.db
        .insert(schema.serviceContributors)
        .values({ serviceId, userId, role })
        .returning();

      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('unique') ||
          error.message.includes('duplicate'))
      ) {
        throw new ConflictException(
          'User is already a contributor to this service',
        );
      }
      throw error;
    }
  }

  async removeContributor(serviceId: string, userId: string) {
    // Check last owner protection
    const contributor = await this.db
      .select({ role: schema.serviceContributors.role })
      .from(schema.serviceContributors)
      .where(
        and(
          eq(schema.serviceContributors.serviceId, serviceId),
          eq(schema.serviceContributors.userId, userId),
        ),
      )
      .limit(1);

    if (contributor.length === 0) {
      throw new NotFoundException('Contributor not found');
    }

    if (contributor[0].role === 'owner') {
      const ownerCount = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.serviceContributors)
        .where(
          and(
            eq(schema.serviceContributors.serviceId, serviceId),
            eq(schema.serviceContributors.role, 'owner'),
          ),
        );

      if (ownerCount[0].count <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of a service',
        );
      }
    }

    await this.db
      .delete(schema.serviceContributors)
      .where(
        and(
          eq(schema.serviceContributors.serviceId, serviceId),
          eq(schema.serviceContributors.userId, userId),
        ),
      );

    return { removed: true };
  }

  async getContributorRole(
    serviceId: string,
    userId: string,
  ): Promise<string | null> {
    const result = await this.db
      .select({ role: schema.serviceContributors.role })
      .from(schema.serviceContributors)
      .where(
        and(
          eq(schema.serviceContributors.serviceId, serviceId),
          eq(schema.serviceContributors.userId, userId),
        ),
      )
      .limit(1);

    return result.length > 0 ? result[0].role : null;
  }
}
