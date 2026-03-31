import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, eq, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

@Injectable()
export class ConsentDocumentContributorsService {
  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  async findByDocument(docId: string) {
    return this.db
      .select({
        userId: schema.consentDocumentContributors.userId,
        role: schema.consentDocumentContributors.role,
        name: schema.users.name,
        email: schema.users.email,
        createdAt: schema.consentDocumentContributors.createdAt,
      })
      .from(schema.consentDocumentContributors)
      .innerJoin(
        schema.users,
        eq(schema.consentDocumentContributors.userId, schema.users.id),
      )
      .where(
        eq(schema.consentDocumentContributors.consentDocumentId, docId),
      );
  }

  async addContributor(
    docId: string,
    userId: string,
    role: 'owner',
  ) {
    try {
      const [result] = await this.db
        .insert(schema.consentDocumentContributors)
        .values({ consentDocumentId: docId, userId, role })
        .returning();

      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('unique') ||
          error.message.includes('duplicate'))
      ) {
        throw new ConflictException(
          'User is already a contributor to this document',
        );
      }
      throw error;
    }
  }

  async removeContributor(docId: string, userId: string) {
    // Check last owner protection
    const contributor = await this.db
      .select({ role: schema.consentDocumentContributors.role })
      .from(schema.consentDocumentContributors)
      .where(
        and(
          eq(schema.consentDocumentContributors.consentDocumentId, docId),
          eq(schema.consentDocumentContributors.userId, userId),
        ),
      )
      .limit(1);

    if (contributor.length === 0) {
      throw new NotFoundException('Contributor not found');
    }

    if (contributor[0].role === 'owner') {
      const ownerCount = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.consentDocumentContributors)
        .where(
          and(
            eq(schema.consentDocumentContributors.consentDocumentId, docId),
            eq(schema.consentDocumentContributors.role, 'owner'),
          ),
        );

      if (ownerCount[0].count <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of a document',
        );
      }
    }

    await this.db
      .delete(schema.consentDocumentContributors)
      .where(
        and(
          eq(schema.consentDocumentContributors.consentDocumentId, docId),
          eq(schema.consentDocumentContributors.userId, userId),
        ),
      );

    return { removed: true };
  }

  async getContributorRole(
    docId: string,
    userId: string,
  ): Promise<string | null> {
    const result = await this.db
      .select({ role: schema.consentDocumentContributors.role })
      .from(schema.consentDocumentContributors)
      .where(
        and(
          eq(schema.consentDocumentContributors.consentDocumentId, docId),
          eq(schema.consentDocumentContributors.userId, userId),
        ),
      )
      .limit(1);

    return result.length > 0 ? result[0].role : null;
  }
}
