import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, asc, eq, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

@Injectable()
export class ConsentDocumentsService {
  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  async create(
    body: { consentDocumentTypeId: string; orgUnitId: string },
    userId: string,
    isAdmin: boolean,
  ) {
    // Verify type exists
    const type = await this.db
      .select({ id: schema.consentDocumentTypes.id })
      .from(schema.consentDocumentTypes)
      .where(eq(schema.consentDocumentTypes.id, body.consentDocumentTypeId))
      .limit(1);

    if (type.length === 0) {
      throw new NotFoundException(
        `Consent document type ${body.consentDocumentTypeId} not found`,
      );
    }

    // Staff: verify org membership
    if (!isAdmin) {
      const membership = await this.db
        .select({ orgUnitId: schema.orgUnitMembers.orgUnitId })
        .from(schema.orgUnitMembers)
        .where(
          and(
            eq(schema.orgUnitMembers.orgUnitId, body.orgUnitId),
            eq(schema.orgUnitMembers.userId, userId),
          ),
        )
        .limit(1);

      if (membership.length === 0) {
        throw new ForbiddenException(
          'Staff can only create documents in their own org unit',
        );
      }
    }

    return this.db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(schema.consentDocuments)
        .values({
          consentDocumentTypeId: body.consentDocumentTypeId,
          orgUnitId: body.orgUnitId,
        })
        .returning();

      await tx.insert(schema.consentDocumentContributors).values({
        consentDocumentId: doc.id,
        userId,
        role: 'owner',
      });

      return doc;
    });
  }

  async findAll(
    page: number,
    limit: number,
    filters: {
      orgUnitId?: string;
      consentDocumentTypeId?: string;
    },
    userId: string,
    isAdmin: boolean,
  ) {
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.orgUnitId) {
      conditions.push(
        eq(schema.consentDocuments.orgUnitId, filters.orgUnitId),
      );
    }

    if (filters.consentDocumentTypeId) {
      conditions.push(
        eq(
          schema.consentDocuments.consentDocumentTypeId,
          filters.consentDocumentTypeId,
        ),
      );
    }

    // Staff: only documents where they are a contributor
    if (!isAdmin) {
      conditions.push(
        sql`${schema.consentDocuments.id} IN (
          SELECT ${schema.consentDocumentContributors.consentDocumentId}
          FROM ${schema.consentDocumentContributors}
          WHERE ${schema.consentDocumentContributors.userId} = ${userId}
        )`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [docs, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.consentDocuments)
        .where(where)
        .orderBy(asc(schema.consentDocuments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.consentDocuments)
        .where(where),
    ]);

    const totalDocs = countResult[0].count;
    const totalPages = Math.ceil(totalDocs / limit);

    return { docs, totalDocs, totalPages, page, limit };
  }

  async findById(docId: string) {
    const results = await this.db
      .select()
      .from(schema.consentDocuments)
      .where(eq(schema.consentDocuments.id, docId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Consent document ${docId} not found`);
    }

    const doc = results[0];

    let publishedVersion = null;
    if (doc.publishedConsentDocumentVersionId) {
      const versionResults = await this.db
        .select()
        .from(schema.consentDocumentVersions)
        .where(
          eq(
            schema.consentDocumentVersions.id,
            doc.publishedConsentDocumentVersionId,
          ),
        )
        .limit(1);

      if (versionResults.length > 0) {
        const translations = await this.db
          .select()
          .from(schema.consentDocumentVersionTranslations)
          .where(
            eq(
              schema.consentDocumentVersionTranslations.consentDocumentVersionId,
              versionResults[0].id,
            ),
          );

        publishedVersion = { ...versionResults[0], translations };
      }
    }

    // Fetch all versions for admin view
    const versions = await this.db
      .select({
        id: schema.consentDocumentVersions.id,
        version: schema.consentDocumentVersions.version,
        status: schema.consentDocumentVersions.status,
        consentDocumentTypeVersionId:
          schema.consentDocumentVersions.consentDocumentTypeVersionId,
        publishedAt: schema.consentDocumentVersions.publishedAt,
        archivedAt: schema.consentDocumentVersions.archivedAt,
        createdAt: schema.consentDocumentVersions.createdAt,
        updatedAt: schema.consentDocumentVersions.updatedAt,
      })
      .from(schema.consentDocumentVersions)
      .where(eq(schema.consentDocumentVersions.consentDocumentId, docId))
      .orderBy(asc(schema.consentDocumentVersions.version));

    return { ...doc, publishedVersion, versions };
  }

  async createVersion(docId: string, consentDocumentTypeVersionId: string) {
    const doc = await this.db
      .select()
      .from(schema.consentDocuments)
      .where(eq(schema.consentDocuments.id, docId))
      .limit(1);

    if (doc.length === 0) {
      throw new NotFoundException(`Consent document ${docId} not found`);
    }

    // Verify type version exists
    const typeVersion = await this.db
      .select({ id: schema.consentDocumentTypeVersions.id })
      .from(schema.consentDocumentTypeVersions)
      .where(
        eq(
          schema.consentDocumentTypeVersions.id,
          consentDocumentTypeVersionId,
        ),
      )
      .limit(1);

    if (typeVersion.length === 0) {
      throw new NotFoundException(
        `Consent document type version ${consentDocumentTypeVersionId} not found`,
      );
    }

    const [version] = await this.db
      .insert(schema.consentDocumentVersions)
      .values({
        consentDocumentId: docId,
        consentDocumentTypeVersionId,
        version: sql<number>`COALESCE((
          SELECT MAX(${schema.consentDocumentVersions.version})
          FROM ${schema.consentDocumentVersions}
          WHERE ${schema.consentDocumentVersions.consentDocumentId} = ${docId}
        ), 0) + 1`,
        status: 'draft',
      })
      .returning();

    return version;
  }

  async getVersion(docId: string, versionId: string) {
    const results = await this.db
      .select()
      .from(schema.consentDocumentVersions)
      .where(
        and(
          eq(schema.consentDocumentVersions.id, versionId),
          eq(schema.consentDocumentVersions.consentDocumentId, docId),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const translations = await this.db
      .select()
      .from(schema.consentDocumentVersionTranslations)
      .where(
        eq(
          schema.consentDocumentVersionTranslations.consentDocumentVersionId,
          versionId,
        ),
      );

    return { ...results[0], translations };
  }

  async upsertTranslation(
    docId: string,
    versionId: string,
    locale: string,
    body: { content: Record<string, unknown> },
  ) {
    const version = await this.db
      .select()
      .from(schema.consentDocumentVersions)
      .where(
        and(
          eq(schema.consentDocumentVersions.id, versionId),
          eq(schema.consentDocumentVersions.consentDocumentId, docId),
        ),
      )
      .limit(1);

    if (version.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    if (version[0].status !== 'draft') {
      throw new BadRequestException(
        'Translations can only be modified on draft versions',
      );
    }

    const [result] = await this.db
      .insert(schema.consentDocumentVersionTranslations)
      .values({
        consentDocumentVersionId: versionId,
        locale,
        content: body.content,
      })
      .onConflictDoUpdate({
        target: [
          schema.consentDocumentVersionTranslations.consentDocumentVersionId,
          schema.consentDocumentVersionTranslations.locale,
        ],
        set: { content: body.content },
      })
      .returning();

    return result;
  }

  async publishVersion(docId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.consentDocumentVersions)
        .where(
          and(
            eq(schema.consentDocumentVersions.id, versionId),
            eq(schema.consentDocumentVersions.consentDocumentId, docId),
          ),
        )
        .limit(1);

      if (version.length === 0) {
        throw new NotFoundException(`Version ${versionId} not found`);
      }

      if (version[0].status !== 'draft') {
        throw new BadRequestException('Only draft versions can be published');
      }

      const translations = await tx
        .select({ id: schema.consentDocumentVersionTranslations.id })
        .from(schema.consentDocumentVersionTranslations)
        .where(
          eq(
            schema.consentDocumentVersionTranslations.consentDocumentVersionId,
            versionId,
          ),
        )
        .limit(1);

      if (translations.length === 0) {
        throw new BadRequestException(
          'At least one translation is required before publishing',
        );
      }

      // Archive currently published version
      const doc = await tx
        .select()
        .from(schema.consentDocuments)
        .where(eq(schema.consentDocuments.id, docId))
        .limit(1);

      if (
        doc[0].publishedConsentDocumentVersionId &&
        doc[0].publishedConsentDocumentVersionId !== versionId
      ) {
        await tx
          .update(schema.consentDocumentVersions)
          .set({ status: 'archived', archivedAt: new Date() })
          .where(
            eq(
              schema.consentDocumentVersions.id,
              doc[0].publishedConsentDocumentVersionId,
            ),
          );
      }

      // Publish the version
      const [published] = await tx
        .update(schema.consentDocumentVersions)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(schema.consentDocumentVersions.id, versionId))
        .returning();

      // Update parent FK
      await tx
        .update(schema.consentDocuments)
        .set({ publishedConsentDocumentVersionId: versionId })
        .where(eq(schema.consentDocuments.id, docId));

      return published;
    });
  }

  async archiveVersion(docId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.consentDocumentVersions)
        .where(
          and(
            eq(schema.consentDocumentVersions.id, versionId),
            eq(schema.consentDocumentVersions.consentDocumentId, docId),
          ),
        )
        .limit(1);

      if (version.length === 0) {
        throw new NotFoundException(`Version ${versionId} not found`);
      }

      if (version[0].status !== 'published') {
        throw new BadRequestException(
          'Only published versions can be archived',
        );
      }

      const [archived] = await tx
        .update(schema.consentDocumentVersions)
        .set({ status: 'archived', archivedAt: new Date() })
        .where(eq(schema.consentDocumentVersions.id, versionId))
        .returning();

      // Null out parent FK if it points to this version
      await tx
        .update(schema.consentDocuments)
        .set({ publishedConsentDocumentVersionId: null })
        .where(
          and(
            eq(schema.consentDocuments.id, docId),
            eq(
              schema.consentDocuments.publishedConsentDocumentVersionId,
              versionId,
            ),
          ),
        );

      return archived;
    });
  }
}
