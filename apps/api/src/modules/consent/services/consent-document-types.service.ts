import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Database,
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  schema,
  sql,
} from '@repo/db';
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

  async findAllPublished(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;

    const publishedFilter = sql`${schema.consentDocumentTypes.publishedConsentDocumentTypeVersionId} IS NOT NULL`;

    const searchFilter = search
      ? sql`${schema.consentDocumentTypes.id} IN (
          SELECT ${schema.consentDocumentTypeVersions.consentDocumentTypeId}
          FROM ${schema.consentDocumentTypeVersions}
          INNER JOIN ${schema.consentDocumentTypeVersionTranslations}
            ON ${schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId} = ${schema.consentDocumentTypeVersions.id}
          WHERE ${ilike(schema.consentDocumentTypeVersionTranslations.name, `%${search}%`)}
            AND ${eq(schema.consentDocumentTypeVersionTranslations.locale, 'en')}
        )`
      : undefined;

    const whereClause = and(publishedFilter, searchFilter);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: schema.consentDocumentTypes.id,
          name: schema.consentDocumentTypeVersionTranslations.name,
        })
        .from(schema.consentDocumentTypes)
        .innerJoin(
          schema.consentDocumentTypeVersions,
          eq(
            schema.consentDocumentTypeVersions.id,
            schema.consentDocumentTypes.publishedConsentDocumentTypeVersionId,
          ),
        )
        .innerJoin(
          schema.consentDocumentTypeVersionTranslations,
          and(
            eq(
              schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
              schema.consentDocumentTypeVersions.id,
            ),
            eq(schema.consentDocumentTypeVersionTranslations.locale, 'en'),
          ),
        )
        .where(whereClause)
        .orderBy(asc(schema.consentDocumentTypeVersionTranslations.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.consentDocumentTypes)
        .where(whereClause),
    ]);

    const totalDocs = countResult[0].count;
    const totalPages = Math.ceil(totalDocs / limit);

    return { docs: rows, totalDocs, totalPages, page, limit };
  }

  async findAll(
    page: number,
    limit: number,
    isAdmin: boolean,
    search?: string,
  ) {
    const offset = (page - 1) * limit;

    const publishedFilter = isAdmin
      ? undefined
      : sql`${schema.consentDocumentTypes.publishedConsentDocumentTypeVersionId} IS NOT NULL`;

    const searchFilter = search
      ? sql`${schema.consentDocumentTypes.id} IN (
          SELECT ${schema.consentDocumentTypeVersions.consentDocumentTypeId}
          FROM ${schema.consentDocumentTypeVersions}
          INNER JOIN ${schema.consentDocumentTypeVersionTranslations}
            ON ${schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId} = ${schema.consentDocumentTypeVersions.id}
          WHERE ${ilike(schema.consentDocumentTypeVersionTranslations.name, `%${search}%`)}
            AND ${eq(schema.consentDocumentTypeVersionTranslations.locale, 'en')}
        )`
      : undefined;

    const whereClause = and(publishedFilter, searchFilter);

    const [docs, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.consentDocumentTypes)
        .where(whereClause)
        .orderBy(asc(schema.consentDocumentTypes.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.consentDocumentTypes)
        .where(whereClause),
    ]);

    const totalDocs = countResult[0].count;
    const totalPages = Math.ceil(totalDocs / limit);

    const enrichedDocs = await this.enrichTypesWithTranslations(docs);

    return { docs: enrichedDocs, totalDocs, totalPages, page, limit };
  }

  private async enrichTypesWithTranslations(
    docs: (typeof schema.consentDocumentTypes.$inferSelect)[],
  ) {
    if (docs.length === 0) return [];

    const typeIds = docs.map((d) => d.id);

    // Fetch all versions for these types
    const versions = await this.db
      .select()
      .from(schema.consentDocumentTypeVersions)
      .where(
        inArray(
          schema.consentDocumentTypeVersions.consentDocumentTypeId,
          typeIds,
        ),
      )
      .orderBy(desc(schema.consentDocumentTypeVersions.version));

    // Determine which version IDs we need translations for:
    // published version (if any) or latest version per type
    const versionIdsByType = new Map<
      string,
      { displayVersionId: string; updatesPending: boolean }
    >();

    for (const type of docs) {
      const typeVersions = versions.filter(
        (v) => v.consentDocumentTypeId === type.id,
      );
      if (typeVersions.length === 0) {
        versionIdsByType.set(type.id, {
          displayVersionId: '',
          updatesPending: false,
        });
        continue;
      }

      const publishedVersion = type.publishedConsentDocumentTypeVersionId
        ? typeVersions.find(
            (v) => v.id === type.publishedConsentDocumentTypeVersionId,
          )
        : null;

      const latestVersion = typeVersions[0]; // already sorted desc
      const hasDraft = typeVersions.some((v) => v.status === 'draft');

      versionIdsByType.set(type.id, {
        displayVersionId: publishedVersion
          ? publishedVersion.id
          : latestVersion.id,
        updatesPending: !!publishedVersion && hasDraft,
      });
    }

    const relevantVersionIds = [
      ...new Set(
        [...versionIdsByType.values()]
          .map((v) => v.displayVersionId)
          .filter(Boolean),
      ),
    ];

    if (relevantVersionIds.length === 0) {
      return docs.map((d) => ({
        ...d,
        name: null,
        description: null,
        updatesPending: false,
      }));
    }

    // Fetch 'en' translations for the relevant versions
    const translations = await this.db
      .select()
      .from(schema.consentDocumentTypeVersionTranslations)
      .where(
        and(
          inArray(
            schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
            relevantVersionIds,
          ),
          eq(schema.consentDocumentTypeVersionTranslations.locale, 'en'),
        ),
      );

    const translationByVersionId = new Map(
      translations.map((t) => [t.consentDocumentTypeVersionId, t]),
    );

    return docs.map((d) => {
      const info = versionIdsByType.get(d.id);
      const translation = info
        ? translationByVersionId.get(info.displayVersionId)
        : null;

      return {
        ...d,
        name: translation?.name ?? null,
        description: translation?.description ?? null,
        updatesPending: info?.updatesPending ?? false,
      };
    });
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

    // Enrich versions with 'en' translation name/description
    const versionIds = versions.map((v) => v.id);
    const enTranslations =
      versionIds.length > 0
        ? await this.db
            .select()
            .from(schema.consentDocumentTypeVersionTranslations)
            .where(
              and(
                inArray(
                  schema.consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
                  versionIds,
                ),
                eq(
                  schema.consentDocumentTypeVersionTranslations.locale,
                  'en',
                ),
              ),
            )
        : [];

    const translationByVersionId = new Map(
      enTranslations.map((t) => [t.consentDocumentTypeVersionId, t]),
    );

    const enrichedVersions = versions.map((v) => {
      const t = translationByVersionId.get(v.id);
      return {
        ...v,
        name: t?.name ?? null,
        description: t?.description ?? null,
      };
    });

    return { ...type, publishedVersion, versions: enrichedVersions };
  }

  async createVersion(typeId: string) {
    return this.db.transaction(async (tx) => {
      const type = await tx
        .select()
        .from(schema.consentDocumentTypes)
        .where(eq(schema.consentDocumentTypes.id, typeId))
        .limit(1);

      if (type.length === 0) {
        throw new NotFoundException(
          `Consent document type ${typeId} not found`,
        );
      }

      const [sourceVersion] = await tx
        .select({ id: schema.consentDocumentTypeVersions.id })
        .from(schema.consentDocumentTypeVersions)
        .where(eq(schema.consentDocumentTypeVersions.consentDocumentTypeId, typeId))
        .orderBy(desc(schema.consentDocumentTypeVersions.version))
        .limit(1);

      const [version] = await tx
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

      if (sourceVersion) {
        const sourceTranslations = await tx
          .select()
          .from(schema.consentDocumentTypeVersionTranslations)
          .where(
            eq(
              schema.consentDocumentTypeVersionTranslations
                .consentDocumentTypeVersionId,
              sourceVersion.id,
            ),
          );

        if (sourceTranslations.length > 0) {
          await tx
            .insert(schema.consentDocumentTypeVersionTranslations)
            .values(
              sourceTranslations.map((t) => ({
                consentDocumentTypeVersionId: version.id,
                locale: t.locale,
                name: t.name,
                description: t.description,
                schema: t.schema,
                uiSchema: t.uiSchema,
              })),
            );
        }
      }

      return version;
    });
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

  async delete(typeId: string) {
    const results = await this.db
      .select()
      .from(schema.consentDocumentTypes)
      .where(eq(schema.consentDocumentTypes.id, typeId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Consent document type ${typeId} not found`);
    }

    await this.db
      .delete(schema.consentDocumentTypes)
      .where(eq(schema.consentDocumentTypes.id, typeId));
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
