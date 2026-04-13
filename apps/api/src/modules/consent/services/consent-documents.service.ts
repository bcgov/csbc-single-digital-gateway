import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, asc, desc, eq, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

@Injectable()
export class ConsentDocumentsService {
  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  private readonly logger = new Logger(ConsentDocumentsService.name);

  async create(
    body: {
      consentDocumentTypeId: string;
      orgUnitId: string;
      name: string;
      description?: string;
      content?: Record<string, unknown>;
    },
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

      // Auto-create version 1 (draft) + en translation
      const typeVersion = await tx
        .select({ id: schema.consentDocumentTypeVersions.id })
        .from(schema.consentDocumentTypeVersions)
        .where(
          and(
            eq(
              schema.consentDocumentTypeVersions.consentDocumentTypeId,
              body.consentDocumentTypeId,
            ),
            eq(schema.consentDocumentTypeVersions.status, 'published'),
          ),
        )
        .orderBy(desc(schema.consentDocumentTypeVersions.publishedAt))
        .limit(1);

      if (typeVersion.length === 0) {
        this.logger.warn(
          `No published type version for type ${body.consentDocumentTypeId} — skipping auto-version`,
        );
        return doc;
      }

      const [version] = await tx
        .insert(schema.consentDocumentVersions)
        .values({
          consentDocumentId: doc.id,
          consentDocumentTypeVersionId: typeVersion[0].id,
          version: 1,
          status: 'draft',
        })
        .returning();

      const [translation] = await tx
        .insert(schema.consentDocumentVersionTranslations)
        .values({
          consentDocumentVersionId: version.id,
          locale: 'en',
          name: body.name,
          description: body.description ?? null,
          content: body.content ?? {},
        })
        .returning();

      return {
        ...doc,
        version: { ...version, translations: [translation] },
      };
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
      conditions.push(eq(schema.consentDocuments.orgUnitId, filters.orgUnitId));
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

    const [rows, countResult] = await Promise.all([
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

    const total = countResult[0].count;
    const totalPages = Math.ceil(total / limit);

    // Enrich each row with name/description from its published version translation,
    // falling back to the latest version's translation
    const data = await Promise.all(
      rows.map(async (doc) => {
        const targetVersionId = doc.publishedConsentDocumentVersionId;

        let translation: { name: string; description: string | null } | null =
          null;

        if (targetVersionId) {
          const rows = await this.db
            .select({
              name: schema.consentDocumentVersionTranslations.name,
              description:
                schema.consentDocumentVersionTranslations.description,
            })
            .from(schema.consentDocumentVersionTranslations)
            .where(
              eq(
                schema.consentDocumentVersionTranslations
                  .consentDocumentVersionId,
                targetVersionId,
              ),
            )
            .limit(1);
          translation = rows[0] ?? null;
        }

        if (!translation) {
          // Fallback: latest version's first translation
          const rows = await this.db
            .select({
              name: schema.consentDocumentVersionTranslations.name,
              description:
                schema.consentDocumentVersionTranslations.description,
            })
            .from(schema.consentDocumentVersionTranslations)
            .innerJoin(
              schema.consentDocumentVersions,
              eq(
                schema.consentDocumentVersionTranslations
                  .consentDocumentVersionId,
                schema.consentDocumentVersions.id,
              ),
            )
            .where(eq(schema.consentDocumentVersions.consentDocumentId, doc.id))
            .orderBy(desc(schema.consentDocumentVersions.version))
            .limit(1);
          translation = rows[0] ?? null;
        }

        return {
          ...doc,
          name: translation?.name ?? null,
          description: translation?.description ?? null,
        };
      }),
    );

    return { data, total, totalPages, page, limit };
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
              schema.consentDocumentVersionTranslations
                .consentDocumentVersionId,
              versionResults[0].id,
            ),
          );

        const firstTranslation = translations[0];
        publishedVersion = {
          ...versionResults[0],
          name: firstTranslation?.name ?? null,
          description: firstTranslation?.description ?? null,
          translations,
        };
      }
    }

    // Fetch all versions for admin view, with name/description from first translation
    const versionRows = await this.db
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

    const versions = await Promise.all(
      versionRows.map(async (v) => {
        const rows = await this.db
          .select({
            name: schema.consentDocumentVersionTranslations.name,
            description: schema.consentDocumentVersionTranslations.description,
          })
          .from(schema.consentDocumentVersionTranslations)
          .where(
            eq(
              schema.consentDocumentVersionTranslations
                .consentDocumentVersionId,
              v.id,
            ),
          )
          .limit(1);
        return {
          ...v,
          name: rows[0]?.name ?? null,
          description: rows[0]?.description ?? null,
        };
      }),
    );

    // Derive name/description from published version, falling back to latest
    let docName: string | null = null;
    let docDescription: string | null = null;

    if (publishedVersion) {
      const t = publishedVersion.translations[0];
      if (t) {
        docName = t.name;
        docDescription = t.description;
      }
    }

    if (!docName && versions.length > 0) {
      const latestVersion = versions[versions.length - 1];
      const rows = await this.db
        .select({
          name: schema.consentDocumentVersionTranslations.name,
          description: schema.consentDocumentVersionTranslations.description,
        })
        .from(schema.consentDocumentVersionTranslations)
        .where(
          eq(
            schema.consentDocumentVersionTranslations.consentDocumentVersionId,
            latestVersion.id,
          ),
        )
        .limit(1);
      if (rows[0]) {
        docName = rows[0].name;
        docDescription = rows[0].description;
      }
    }

    return {
      ...doc,
      name: docName,
      description: docDescription,
      publishedVersion,
      versions,
    };
  }

  async createVersion(docId: string) {
    const doc = await this.db
      .select()
      .from(schema.consentDocuments)
      .where(eq(schema.consentDocuments.id, docId))
      .limit(1);

    if (doc.length === 0) {
      throw new NotFoundException(`Consent document ${docId} not found`);
    }

    // Resolve the most recently published type version for this document's type
    const typeVersion = await this.db
      .select({ id: schema.consentDocumentTypeVersions.id })
      .from(schema.consentDocumentTypeVersions)
      .where(
        and(
          eq(
            schema.consentDocumentTypeVersions.consentDocumentTypeId,
            doc[0].consentDocumentTypeId,
          ),
          eq(schema.consentDocumentTypeVersions.status, 'published'),
        ),
      )
      .orderBy(desc(schema.consentDocumentTypeVersions.publishedAt))
      .limit(1);

    if (typeVersion.length === 0) {
      throw new BadRequestException(
        'No published type version available for this document type',
      );
    }

    const consentDocumentTypeVersionId = typeVersion[0].id;

    // Find the previous latest version to copy translations from
    const previousVersions = await this.db
      .select({ id: schema.consentDocumentVersions.id })
      .from(schema.consentDocumentVersions)
      .where(eq(schema.consentDocumentVersions.consentDocumentId, docId))
      .orderBy(desc(schema.consentDocumentVersions.version))
      .limit(1);

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

    // Copy translations from the previous version
    if (previousVersions.length > 0) {
      const previousTranslations = await this.db
        .select()
        .from(schema.consentDocumentVersionTranslations)
        .where(
          eq(
            schema.consentDocumentVersionTranslations.consentDocumentVersionId,
            previousVersions[0].id,
          ),
        );

      if (previousTranslations.length > 0) {
        await this.db.insert(schema.consentDocumentVersionTranslations).values(
          previousTranslations.map((t) => ({
            consentDocumentVersionId: version.id,
            locale: t.locale,
            name: t.name,
            description: t.description,
            content: t.content,
          })),
        );
      }
    }

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

    const firstTranslation = translations[0];
    return {
      ...results[0],
      name: firstTranslation?.name ?? null,
      description: firstTranslation?.description ?? null,
      translations,
    };
  }

  async upsertTranslation(
    docId: string,
    versionId: string,
    locale: string,
    body: {
      name: string;
      description?: string;
      content: Record<string, unknown>;
    },
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
        name: body.name,
        description: body.description ?? null,
        content: body.content,
      })
      .onConflictDoUpdate({
        target: [
          schema.consentDocumentVersionTranslations.consentDocumentVersionId,
          schema.consentDocumentVersionTranslations.locale,
        ],
        set: {
          name: body.name,
          description: body.description ?? null,
          content: body.content,
        },
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

  async delete(docId: string) {
    const results = await this.db
      .select({ id: schema.consentDocuments.id })
      .from(schema.consentDocuments)
      .where(eq(schema.consentDocuments.id, docId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Consent document ${docId} not found`);
    }

    // Null out self-referencing FK before deleting to avoid FK violation
    await this.db
      .update(schema.consentDocuments)
      .set({ publishedConsentDocumentVersionId: null })
      .where(eq(schema.consentDocuments.id, docId));

    await this.db
      .delete(schema.consentDocuments)
      .where(eq(schema.consentDocuments.id, docId));
  }
}
