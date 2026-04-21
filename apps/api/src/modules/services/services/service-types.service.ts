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
export class ServiceTypesService {
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
        .insert(schema.serviceTypes)
        .values({})
        .returning();

      const [version] = await tx
        .insert(schema.serviceTypeVersions)
        .values({
          serviceTypeId: type.id,
          version: 1,
          status: 'draft',
        })
        .returning();

      const [translation] = await tx
        .insert(schema.serviceTypeVersionTranslations)
        .values({
          serviceTypeVersionId: version.id,
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

    const publishedFilter = sql`${schema.serviceTypes.publishedServiceTypeVersionId} IS NOT NULL`;

    const searchFilter = search
      ? sql`${schema.serviceTypes.id} IN (
          SELECT ${schema.serviceTypeVersions.serviceTypeId}
          FROM ${schema.serviceTypeVersions}
          INNER JOIN ${schema.serviceTypeVersionTranslations}
            ON ${schema.serviceTypeVersionTranslations.serviceTypeVersionId} = ${schema.serviceTypeVersions.id}
          WHERE ${ilike(schema.serviceTypeVersionTranslations.name, `%${search}%`)}
            AND ${eq(schema.serviceTypeVersionTranslations.locale, 'en')}
        )`
      : undefined;

    const whereClause = and(publishedFilter, searchFilter);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: schema.serviceTypes.id,
          name: schema.serviceTypeVersionTranslations.name,
        })
        .from(schema.serviceTypes)
        .innerJoin(
          schema.serviceTypeVersions,
          eq(
            schema.serviceTypeVersions.id,
            schema.serviceTypes.publishedServiceTypeVersionId,
          ),
        )
        .innerJoin(
          schema.serviceTypeVersionTranslations,
          and(
            eq(
              schema.serviceTypeVersionTranslations.serviceTypeVersionId,
              schema.serviceTypeVersions.id,
            ),
            eq(schema.serviceTypeVersionTranslations.locale, 'en'),
          ),
        )
        .where(whereClause)
        .orderBy(asc(schema.serviceTypeVersionTranslations.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.serviceTypes)
        .where(whereClause),
    ]);

    const total = countResult[0].count;
    const totalPages = Math.ceil(total / limit);

    return { data: rows, total, totalPages, page, limit };
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
      : sql`${schema.serviceTypes.publishedServiceTypeVersionId} IS NOT NULL`;

    const searchFilter = search
      ? sql`${schema.serviceTypes.id} IN (
          SELECT ${schema.serviceTypeVersions.serviceTypeId}
          FROM ${schema.serviceTypeVersions}
          INNER JOIN ${schema.serviceTypeVersionTranslations}
            ON ${schema.serviceTypeVersionTranslations.serviceTypeVersionId} = ${schema.serviceTypeVersions.id}
          WHERE ${ilike(schema.serviceTypeVersionTranslations.name, `%${search}%`)}
            AND ${eq(schema.serviceTypeVersionTranslations.locale, 'en')}
        )`
      : undefined;

    const whereClause = and(publishedFilter, searchFilter);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.serviceTypes)
        .where(whereClause)
        .orderBy(asc(schema.serviceTypes.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.serviceTypes)
        .where(whereClause),
    ]);

    const total = countResult[0].count;
    const totalPages = Math.ceil(total / limit);

    const data = await this.enrichTypesWithTranslations(rows);

    return { data, total, totalPages, page, limit };
  }

  private async enrichTypesWithTranslations(
    types: (typeof schema.serviceTypes.$inferSelect)[],
  ) {
    if (types.length === 0) return [];

    const typeIds = types.map((d) => d.id);

    const versions = await this.db
      .select()
      .from(schema.serviceTypeVersions)
      .where(inArray(schema.serviceTypeVersions.serviceTypeId, typeIds))
      .orderBy(desc(schema.serviceTypeVersions.version));

    const versionIdsByType = new Map<
      string,
      { displayVersionId: string; updatesPending: boolean }
    >();

    for (const type of types) {
      const typeVersions = versions.filter((v) => v.serviceTypeId === type.id);
      if (typeVersions.length === 0) {
        versionIdsByType.set(type.id, {
          displayVersionId: '',
          updatesPending: false,
        });
        continue;
      }

      const publishedVersion = type.publishedServiceTypeVersionId
        ? typeVersions.find((v) => v.id === type.publishedServiceTypeVersionId)
        : null;

      const latestVersion = typeVersions[0];
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
      return types.map((d) => ({
        ...d,
        name: null,
        description: null,
        updatesPending: false,
      }));
    }

    const translations = await this.db
      .select()
      .from(schema.serviceTypeVersionTranslations)
      .where(
        and(
          inArray(
            schema.serviceTypeVersionTranslations.serviceTypeVersionId,
            relevantVersionIds,
          ),
          eq(schema.serviceTypeVersionTranslations.locale, 'en'),
        ),
      );

    const translationByVersionId = new Map(
      translations.map((t) => [t.serviceTypeVersionId, t]),
    );

    return types.map((d) => {
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
      .from(schema.serviceTypes)
      .where(eq(schema.serviceTypes.id, typeId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Service type ${typeId} not found`);
    }

    const type = results[0];

    if (!isAdmin && type.publishedServiceTypeVersionId === null) {
      throw new NotFoundException(`Service type ${typeId} not found`);
    }

    let publishedVersion = null;
    if (type.publishedServiceTypeVersionId) {
      const versionResults = await this.db
        .select()
        .from(schema.serviceTypeVersions)
        .where(
          eq(schema.serviceTypeVersions.id, type.publishedServiceTypeVersionId),
        )
        .limit(1);

      if (versionResults.length > 0) {
        const translations = await this.db
          .select()
          .from(schema.serviceTypeVersionTranslations)
          .where(
            eq(
              schema.serviceTypeVersionTranslations.serviceTypeVersionId,
              versionResults[0].id,
            ),
          );

        publishedVersion = { ...versionResults[0], translations };
      }
    }

    const versions = await this.db
      .select({
        id: schema.serviceTypeVersions.id,
        version: schema.serviceTypeVersions.version,
        status: schema.serviceTypeVersions.status,
        publishedAt: schema.serviceTypeVersions.publishedAt,
        archivedAt: schema.serviceTypeVersions.archivedAt,
        createdAt: schema.serviceTypeVersions.createdAt,
        updatedAt: schema.serviceTypeVersions.updatedAt,
      })
      .from(schema.serviceTypeVersions)
      .where(eq(schema.serviceTypeVersions.serviceTypeId, typeId))
      .orderBy(asc(schema.serviceTypeVersions.version));

    const versionIds = versions.map((v) => v.id);
    const enTranslations =
      versionIds.length > 0
        ? await this.db
            .select()
            .from(schema.serviceTypeVersionTranslations)
            .where(
              and(
                inArray(
                  schema.serviceTypeVersionTranslations.serviceTypeVersionId,
                  versionIds,
                ),
                eq(schema.serviceTypeVersionTranslations.locale, 'en'),
              ),
            )
        : [];

    const translationByVersionId = new Map(
      enTranslations.map((t) => [t.serviceTypeVersionId, t]),
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
        .from(schema.serviceTypes)
        .where(eq(schema.serviceTypes.id, typeId))
        .limit(1);

      if (type.length === 0) {
        throw new NotFoundException(`Service type ${typeId} not found`);
      }

      const [sourceVersion] = await tx
        .select({ id: schema.serviceTypeVersions.id })
        .from(schema.serviceTypeVersions)
        .where(eq(schema.serviceTypeVersions.serviceTypeId, typeId))
        .orderBy(desc(schema.serviceTypeVersions.version))
        .limit(1);

      const [version] = await tx
        .insert(schema.serviceTypeVersions)
        .values({
          serviceTypeId: typeId,
          version: sql<number>`COALESCE((
            SELECT MAX(${schema.serviceTypeVersions.version})
            FROM ${schema.serviceTypeVersions}
            WHERE ${schema.serviceTypeVersions.serviceTypeId} = ${typeId}
          ), 0) + 1`,
          status: 'draft',
        })
        .returning();

      if (sourceVersion) {
        const sourceTranslations = await tx
          .select()
          .from(schema.serviceTypeVersionTranslations)
          .where(
            eq(
              schema.serviceTypeVersionTranslations.serviceTypeVersionId,
              sourceVersion.id,
            ),
          );

        if (sourceTranslations.length > 0) {
          await tx.insert(schema.serviceTypeVersionTranslations).values(
            sourceTranslations.map((t) => ({
              serviceTypeVersionId: version.id,
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
      .from(schema.serviceTypeVersions)
      .where(
        and(
          eq(schema.serviceTypeVersions.id, versionId),
          eq(schema.serviceTypeVersions.serviceTypeId, typeId),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const translations = await this.db
      .select()
      .from(schema.serviceTypeVersionTranslations)
      .where(
        eq(
          schema.serviceTypeVersionTranslations.serviceTypeVersionId,
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
      .from(schema.serviceTypeVersions)
      .where(
        and(
          eq(schema.serviceTypeVersions.id, versionId),
          eq(schema.serviceTypeVersions.serviceTypeId, typeId),
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
      .insert(schema.serviceTypeVersionTranslations)
      .values({
        serviceTypeVersionId: versionId,
        locale,
        name: body.name,
        description: body.description,
        schema: body.schema ?? {},
        uiSchema: body.uiSchema ?? {},
      })
      .onConflictDoUpdate({
        target: [
          schema.serviceTypeVersionTranslations.serviceTypeVersionId,
          schema.serviceTypeVersionTranslations.locale,
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
        .from(schema.serviceTypeVersions)
        .where(
          and(
            eq(schema.serviceTypeVersions.id, versionId),
            eq(schema.serviceTypeVersions.serviceTypeId, typeId),
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
        .select({ id: schema.serviceTypeVersionTranslations.id })
        .from(schema.serviceTypeVersionTranslations)
        .where(
          eq(
            schema.serviceTypeVersionTranslations.serviceTypeVersionId,
            versionId,
          ),
        )
        .limit(1);

      if (translations.length === 0) {
        throw new BadRequestException(
          'At least one translation is required before publishing',
        );
      }

      const type = await tx
        .select()
        .from(schema.serviceTypes)
        .where(eq(schema.serviceTypes.id, typeId))
        .limit(1);

      if (
        type[0].publishedServiceTypeVersionId &&
        type[0].publishedServiceTypeVersionId !== versionId
      ) {
        await tx
          .update(schema.serviceTypeVersions)
          .set({ status: 'archived', archivedAt: new Date() })
          .where(
            eq(
              schema.serviceTypeVersions.id,
              type[0].publishedServiceTypeVersionId,
            ),
          );
      }

      const [published] = await tx
        .update(schema.serviceTypeVersions)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(schema.serviceTypeVersions.id, versionId))
        .returning();

      await tx
        .update(schema.serviceTypes)
        .set({ publishedServiceTypeVersionId: versionId })
        .where(eq(schema.serviceTypes.id, typeId));

      return published;
    });
  }

  async delete(typeId: string) {
    const results = await this.db
      .select()
      .from(schema.serviceTypes)
      .where(eq(schema.serviceTypes.id, typeId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Service type ${typeId} not found`);
    }

    await this.db
      .delete(schema.serviceTypes)
      .where(eq(schema.serviceTypes.id, typeId));
  }

  async archiveVersion(typeId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.serviceTypeVersions)
        .where(
          and(
            eq(schema.serviceTypeVersions.id, versionId),
            eq(schema.serviceTypeVersions.serviceTypeId, typeId),
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
        .update(schema.serviceTypeVersions)
        .set({ status: 'archived', archivedAt: new Date() })
        .where(eq(schema.serviceTypeVersions.id, versionId))
        .returning();

      await tx
        .update(schema.serviceTypes)
        .set({ publishedServiceTypeVersionId: null })
        .where(
          and(
            eq(schema.serviceTypes.id, typeId),
            eq(schema.serviceTypes.publishedServiceTypeVersionId, versionId),
          ),
        );

      return archived;
    });
  }
}
