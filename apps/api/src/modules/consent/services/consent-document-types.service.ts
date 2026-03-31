import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, asc, eq, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

@Injectable()
export class ConsentDocumentTypesService {
  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  async create(body: {
    name: string;
    description: string;
    schema?: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
  }) {
    return this.db.transaction(async (tx) => {
      const [type] = await tx
        .insert(schema.consentDocumentTypes)
        .values({})
        .returning();

      const [version] = await tx
        .insert(schema.consentDocumentTypeVersions)
        .values({
          consentDocumentTypeId: type.id,
          version: 1,
          status: 'draft',
        })
        .returning();

      const [translation] = await tx
        .insert(schema.consentDocumentTypeVersionTranslations)
        .values({
          consentDocumentTypeVersionId: version.id,
          locale: 'en',
          name: body.name,
          description: body.description,
          schema: body.schema ?? {},
          uiSchema: body.uiSchema ?? {},
        })
        .returning();

      return {
        ...type,
        version: { ...version, translations: [translation] },
      };
    });
  }

  async findAll(page: number, limit: number, isAdmin: boolean) {
    const offset = (page - 1) * limit;

    const publishedFilter = isAdmin
      ? undefined
      : sql`${schema.consentDocumentTypes.publishedConsentDocumentTypeVersionId} IS NOT NULL`;

    const [docs, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.consentDocumentTypes)
        .where(publishedFilter)
        .orderBy(asc(schema.consentDocumentTypes.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.consentDocumentTypes)
        .where(publishedFilter),
    ]);

    const totalDocs = countResult[0].count;
    const totalPages = Math.ceil(totalDocs / limit);

    return { docs, totalDocs, totalPages, page, limit };
  }

  async findById(typeId: string, isAdmin: boolean) {
    const results = await this.db
      .select()
      .from(schema.consentDocumentTypes)
      .where(eq(schema.consentDocumentTypes.id, typeId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Consent document type ${typeId} not found`);
    }

    const type = results[0];

    if (
      !isAdmin &&
      type.publishedConsentDocumentTypeVersionId === null
    ) {
      throw new NotFoundException(`Consent document type ${typeId} not found`);
    }

    let publishedVersion = null;
    if (type.publishedConsentDocumentTypeVersionId) {
      const versionResults = await this.db
        .select()
        .from(schema.consentDocumentTypeVersions)
        .where(
          eq(
            schema.consentDocumentTypeVersions.id,
            type.publishedConsentDocumentTypeVersionId,
          ),
        )
        .limit(1);

      if (versionResults.length > 0) {
        const translations = await this.db
          .select()
          .from(schema.consentDocumentTypeVersionTranslations)
          .where(
            eq(
              schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
              versionResults[0].id,
            ),
          );

        publishedVersion = { ...versionResults[0], translations };
      }
    }

    // Fetch all versions for admin view
    const versions = await this.db
      .select({
        id: schema.consentDocumentTypeVersions.id,
        version: schema.consentDocumentTypeVersions.version,
        status: schema.consentDocumentTypeVersions.status,
        publishedAt: schema.consentDocumentTypeVersions.publishedAt,
        archivedAt: schema.consentDocumentTypeVersions.archivedAt,
        createdAt: schema.consentDocumentTypeVersions.createdAt,
        updatedAt: schema.consentDocumentTypeVersions.updatedAt,
      })
      .from(schema.consentDocumentTypeVersions)
      .where(
        eq(
          schema.consentDocumentTypeVersions.consentDocumentTypeId,
          typeId,
        ),
      )
      .orderBy(asc(schema.consentDocumentTypeVersions.version));

    return { ...type, publishedVersion, versions };
  }

  async createVersion(typeId: string) {
    const type = await this.db
      .select()
      .from(schema.consentDocumentTypes)
      .where(eq(schema.consentDocumentTypes.id, typeId))
      .limit(1);

    if (type.length === 0) {
      throw new NotFoundException(`Consent document type ${typeId} not found`);
    }

    const [version] = await this.db
      .insert(schema.consentDocumentTypeVersions)
      .values({
        consentDocumentTypeId: typeId,
        version: sql<number>`COALESCE((
          SELECT MAX(${schema.consentDocumentTypeVersions.version})
          FROM ${schema.consentDocumentTypeVersions}
          WHERE ${schema.consentDocumentTypeVersions.consentDocumentTypeId} = ${typeId}
        ), 0) + 1`,
        status: 'draft',
      })
      .returning();

    return version;
  }

  async getVersion(typeId: string, versionId: string) {
    const results = await this.db
      .select()
      .from(schema.consentDocumentTypeVersions)
      .where(
        and(
          eq(schema.consentDocumentTypeVersions.id, versionId),
          eq(
            schema.consentDocumentTypeVersions.consentDocumentTypeId,
            typeId,
          ),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const translations = await this.db
      .select()
      .from(schema.consentDocumentTypeVersionTranslations)
      .where(
        eq(
          schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
          versionId,
        ),
      );

    return { ...results[0], translations };
  }

  async upsertTranslation(
    typeId: string,
    versionId: string,
    locale: string,
    body: {
      name: string;
      description: string;
      schema?: Record<string, unknown>;
      uiSchema?: Record<string, unknown>;
    },
  ) {
    const version = await this.db
      .select()
      .from(schema.consentDocumentTypeVersions)
      .where(
        and(
          eq(schema.consentDocumentTypeVersions.id, versionId),
          eq(
            schema.consentDocumentTypeVersions.consentDocumentTypeId,
            typeId,
          ),
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
      .insert(schema.consentDocumentTypeVersionTranslations)
      .values({
        consentDocumentTypeVersionId: versionId,
        locale,
        name: body.name,
        description: body.description,
        schema: body.schema ?? {},
        uiSchema: body.uiSchema ?? {},
      })
      .onConflictDoUpdate({
        target: [
          schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
          schema.consentDocumentTypeVersionTranslations.locale,
        ],
        set: {
          name: body.name,
          description: body.description,
          schema: body.schema ?? {},
          uiSchema: body.uiSchema ?? {},
        },
      })
      .returning();

    return result;
  }

  async publishVersion(typeId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.consentDocumentTypeVersions)
        .where(
          and(
            eq(schema.consentDocumentTypeVersions.id, versionId),
            eq(
              schema.consentDocumentTypeVersions.consentDocumentTypeId,
              typeId,
            ),
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
        .select({ id: schema.consentDocumentTypeVersionTranslations.id })
        .from(schema.consentDocumentTypeVersionTranslations)
        .where(
          eq(
            schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
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
      const type = await tx
        .select()
        .from(schema.consentDocumentTypes)
        .where(eq(schema.consentDocumentTypes.id, typeId))
        .limit(1);

      if (
        type[0].publishedConsentDocumentTypeVersionId &&
        type[0].publishedConsentDocumentTypeVersionId !== versionId
      ) {
        await tx
          .update(schema.consentDocumentTypeVersions)
          .set({ status: 'archived', archivedAt: new Date() })
          .where(
            eq(
              schema.consentDocumentTypeVersions.id,
              type[0].publishedConsentDocumentTypeVersionId,
            ),
          );
      }

      // Publish the version
      const [published] = await tx
        .update(schema.consentDocumentTypeVersions)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(schema.consentDocumentTypeVersions.id, versionId))
        .returning();

      // Update parent FK
      await tx
        .update(schema.consentDocumentTypes)
        .set({ publishedConsentDocumentTypeVersionId: versionId })
        .where(eq(schema.consentDocumentTypes.id, typeId));

      return published;
    });
  }

  async archiveVersion(typeId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.consentDocumentTypeVersions)
        .where(
          and(
            eq(schema.consentDocumentTypeVersions.id, versionId),
            eq(
              schema.consentDocumentTypeVersions.consentDocumentTypeId,
              typeId,
            ),
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
        .update(schema.consentDocumentTypeVersions)
        .set({ status: 'archived', archivedAt: new Date() })
        .where(eq(schema.consentDocumentTypeVersions.id, versionId))
        .returning();

      // Null out parent FK if it points to this version
      await tx
        .update(schema.consentDocumentTypes)
        .set({ publishedConsentDocumentTypeVersionId: null })
        .where(
          and(
            eq(schema.consentDocumentTypes.id, typeId),
            eq(
              schema.consentDocumentTypes.publishedConsentDocumentTypeVersionId,
              versionId,
            ),
          ),
        );

      return archived;
    });
  }
}
