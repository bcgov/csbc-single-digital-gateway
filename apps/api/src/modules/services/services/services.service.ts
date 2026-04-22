import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type Database,
  and,
  asc,
  desc,
  eq,
  inArray,
  schema,
  sql,
} from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';
import { sanitizeContentForPublic } from '../dtos/public-service.dto';

export interface FlatService {
  id: string;
  serviceTypeId: string;
  orgUnitId: string;
  versionId: string;
  publishedAt: string;
  locale: string;
  name: string;
  description: string | null;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const FALLBACK_LOCALE = 'en';

@Injectable()
export class ServicesService {
  constructor(
    @InjectDb()
    private readonly db: Database,
  ) {}

  private readonly logger = new Logger(ServicesService.name);

  async create(
    body: {
      serviceTypeId: string;
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
      .select({ id: schema.serviceTypes.id })
      .from(schema.serviceTypes)
      .where(eq(schema.serviceTypes.id, body.serviceTypeId))
      .limit(1);

    if (type.length === 0) {
      throw new NotFoundException(
        `Service type ${body.serviceTypeId} not found`,
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
          'Staff can only create services in their own org unit',
        );
      }
    }

    return this.db.transaction(async (tx) => {
      const [service] = await tx
        .insert(schema.services)
        .values({
          serviceTypeId: body.serviceTypeId,
          orgUnitId: body.orgUnitId,
        })
        .returning();

      await tx.insert(schema.serviceContributors).values({
        serviceId: service.id,
        userId,
        role: 'owner',
      });

      // Auto-create version 1 (draft) + en translation
      const typeVersion = await tx
        .select({ id: schema.serviceTypeVersions.id })
        .from(schema.serviceTypeVersions)
        .where(
          and(
            eq(schema.serviceTypeVersions.serviceTypeId, body.serviceTypeId),
            eq(schema.serviceTypeVersions.status, 'published'),
          ),
        )
        .orderBy(desc(schema.serviceTypeVersions.publishedAt))
        .limit(1);

      if (typeVersion.length === 0) {
        this.logger.warn(
          `No published type version for type ${body.serviceTypeId} — skipping auto-version`,
        );
        return service;
      }

      const [version] = await tx
        .insert(schema.serviceVersions)
        .values({
          serviceId: service.id,
          serviceTypeVersionId: typeVersion[0].id,
          version: 1,
          status: 'draft',
        })
        .returning();

      const [translation] = await tx
        .insert(schema.serviceVersionTranslations)
        .values({
          serviceVersionId: version.id,
          locale: 'en',
          name: body.name,
          description: body.description ?? null,
          content: body.content ?? {},
        })
        .returning();

      return {
        ...service,
        version: { ...version, translations: [translation] },
      };
    });
  }

  async findAll(
    page: number,
    limit: number,
    filters: {
      orgUnitId?: string;
      serviceTypeId?: string;
    },
    userId: string,
    isAdmin: boolean,
  ) {
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.orgUnitId) {
      conditions.push(eq(schema.services.orgUnitId, filters.orgUnitId));
    }

    if (filters.serviceTypeId) {
      conditions.push(eq(schema.services.serviceTypeId, filters.serviceTypeId));
    }

    // Staff: only services where they are a contributor
    if (!isAdmin) {
      conditions.push(
        sql`${schema.services.id} IN (
          SELECT ${schema.serviceContributors.serviceId}
          FROM ${schema.serviceContributors}
          WHERE ${schema.serviceContributors.userId} = ${userId}
        )`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.services)
        .where(where)
        .orderBy(asc(schema.services.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.services)
        .where(where),
    ]);

    const total = countResult[0].count;
    const totalPages = Math.ceil(total / limit);

    const data = await Promise.all(
      rows.map(async (doc) => {
        const targetVersionId = doc.publishedServiceVersionId;

        let translation: { name: string; description: string | null } | null =
          null;

        if (targetVersionId) {
          const rows = await this.db
            .select({
              name: schema.serviceVersionTranslations.name,
              description: schema.serviceVersionTranslations.description,
            })
            .from(schema.serviceVersionTranslations)
            .where(
              eq(
                schema.serviceVersionTranslations.serviceVersionId,
                targetVersionId,
              ),
            )
            .limit(1);
          translation = rows[0] ?? null;
        }

        if (!translation) {
          const rows = await this.db
            .select({
              name: schema.serviceVersionTranslations.name,
              description: schema.serviceVersionTranslations.description,
            })
            .from(schema.serviceVersionTranslations)
            .innerJoin(
              schema.serviceVersions,
              eq(
                schema.serviceVersionTranslations.serviceVersionId,
                schema.serviceVersions.id,
              ),
            )
            .where(eq(schema.serviceVersions.serviceId, doc.id))
            .orderBy(desc(schema.serviceVersions.version))
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

  async findById(serviceId: string) {
    const results = await this.db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, serviceId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const doc = results[0];

    let publishedVersion = null;
    if (doc.publishedServiceVersionId) {
      const versionResults = await this.db
        .select()
        .from(schema.serviceVersions)
        .where(eq(schema.serviceVersions.id, doc.publishedServiceVersionId))
        .limit(1);

      if (versionResults.length > 0) {
        const translations = await this.db
          .select()
          .from(schema.serviceVersionTranslations)
          .where(
            eq(
              schema.serviceVersionTranslations.serviceVersionId,
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

    const versionRows = await this.db
      .select({
        id: schema.serviceVersions.id,
        version: schema.serviceVersions.version,
        status: schema.serviceVersions.status,
        serviceTypeVersionId: schema.serviceVersions.serviceTypeVersionId,
        publishedAt: schema.serviceVersions.publishedAt,
        archivedAt: schema.serviceVersions.archivedAt,
        createdAt: schema.serviceVersions.createdAt,
        updatedAt: schema.serviceVersions.updatedAt,
      })
      .from(schema.serviceVersions)
      .where(eq(schema.serviceVersions.serviceId, serviceId))
      .orderBy(asc(schema.serviceVersions.version));

    const versions = await Promise.all(
      versionRows.map(async (v) => {
        const rows = await this.db
          .select({
            name: schema.serviceVersionTranslations.name,
            description: schema.serviceVersionTranslations.description,
          })
          .from(schema.serviceVersionTranslations)
          .where(eq(schema.serviceVersionTranslations.serviceVersionId, v.id))
          .limit(1);
        return {
          ...v,
          name: rows[0]?.name ?? null,
          description: rows[0]?.description ?? null,
        };
      }),
    );

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
          name: schema.serviceVersionTranslations.name,
          description: schema.serviceVersionTranslations.description,
        })
        .from(schema.serviceVersionTranslations)
        .where(
          eq(
            schema.serviceVersionTranslations.serviceVersionId,
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

  async createVersion(serviceId: string) {
    const doc = await this.db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, serviceId))
      .limit(1);

    if (doc.length === 0) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const typeVersion = await this.db
      .select({ id: schema.serviceTypeVersions.id })
      .from(schema.serviceTypeVersions)
      .where(
        and(
          eq(schema.serviceTypeVersions.serviceTypeId, doc[0].serviceTypeId),
          eq(schema.serviceTypeVersions.status, 'published'),
        ),
      )
      .orderBy(desc(schema.serviceTypeVersions.publishedAt))
      .limit(1);

    if (typeVersion.length === 0) {
      throw new BadRequestException(
        'No published type version available for this service type',
      );
    }

    const serviceTypeVersionId = typeVersion[0].id;

    const previousVersions = await this.db
      .select({ id: schema.serviceVersions.id })
      .from(schema.serviceVersions)
      .where(eq(schema.serviceVersions.serviceId, serviceId))
      .orderBy(desc(schema.serviceVersions.version))
      .limit(1);

    const [version] = await this.db
      .insert(schema.serviceVersions)
      .values({
        serviceId,
        serviceTypeVersionId,
        version: sql<number>`COALESCE((
          SELECT MAX(${schema.serviceVersions.version})
          FROM ${schema.serviceVersions}
          WHERE ${schema.serviceVersions.serviceId} = ${serviceId}
        ), 0) + 1`,
        status: 'draft',
      })
      .returning();

    // Copy translations from the previous version
    if (previousVersions.length > 0) {
      const previousTranslations = await this.db
        .select()
        .from(schema.serviceVersionTranslations)
        .where(
          eq(
            schema.serviceVersionTranslations.serviceVersionId,
            previousVersions[0].id,
          ),
        );

      if (previousTranslations.length > 0) {
        await this.db.insert(schema.serviceVersionTranslations).values(
          previousTranslations.map((t) => ({
            serviceVersionId: version.id,
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

  async getVersion(serviceId: string, versionId: string) {
    const results = await this.db
      .select()
      .from(schema.serviceVersions)
      .where(
        and(
          eq(schema.serviceVersions.id, versionId),
          eq(schema.serviceVersions.serviceId, serviceId),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const translations = await this.db
      .select()
      .from(schema.serviceVersionTranslations)
      .where(eq(schema.serviceVersionTranslations.serviceVersionId, versionId));

    const firstTranslation = translations[0];
    return {
      ...results[0],
      name: firstTranslation?.name ?? null,
      description: firstTranslation?.description ?? null,
      translations,
    };
  }

  async upsertTranslation(
    serviceId: string,
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
      .from(schema.serviceVersions)
      .where(
        and(
          eq(schema.serviceVersions.id, versionId),
          eq(schema.serviceVersions.serviceId, serviceId),
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
      .insert(schema.serviceVersionTranslations)
      .values({
        serviceVersionId: versionId,
        locale,
        name: body.name,
        description: body.description ?? null,
        content: body.content,
      })
      .onConflictDoUpdate({
        target: [
          schema.serviceVersionTranslations.serviceVersionId,
          schema.serviceVersionTranslations.locale,
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

  async publishVersion(serviceId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.serviceVersions)
        .where(
          and(
            eq(schema.serviceVersions.id, versionId),
            eq(schema.serviceVersions.serviceId, serviceId),
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
        .select({ id: schema.serviceVersionTranslations.id })
        .from(schema.serviceVersionTranslations)
        .where(
          eq(schema.serviceVersionTranslations.serviceVersionId, versionId),
        )
        .limit(1);

      if (translations.length === 0) {
        throw new BadRequestException(
          'At least one translation is required before publishing',
        );
      }

      const doc = await tx
        .select()
        .from(schema.services)
        .where(eq(schema.services.id, serviceId))
        .limit(1);

      if (
        doc[0].publishedServiceVersionId &&
        doc[0].publishedServiceVersionId !== versionId
      ) {
        await tx
          .update(schema.serviceVersions)
          .set({ status: 'archived', archivedAt: new Date() })
          .where(
            eq(schema.serviceVersions.id, doc[0].publishedServiceVersionId),
          );
      }

      const [published] = await tx
        .update(schema.serviceVersions)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(schema.serviceVersions.id, versionId))
        .returning();

      await tx
        .update(schema.services)
        .set({ publishedServiceVersionId: versionId })
        .where(eq(schema.services.id, serviceId));

      return published;
    });
  }

  async archiveVersion(serviceId: string, versionId: string) {
    return this.db.transaction(async (tx) => {
      const version = await tx
        .select()
        .from(schema.serviceVersions)
        .where(
          and(
            eq(schema.serviceVersions.id, versionId),
            eq(schema.serviceVersions.serviceId, serviceId),
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
        .update(schema.serviceVersions)
        .set({ status: 'archived', archivedAt: new Date() })
        .where(eq(schema.serviceVersions.id, versionId))
        .returning();

      await tx
        .update(schema.services)
        .set({ publishedServiceVersionId: null })
        .where(
          and(
            eq(schema.services.id, serviceId),
            eq(schema.services.publishedServiceVersionId, versionId),
          ),
        );

      return archived;
    });
  }

  async findAllPublished(
    page: number,
    limit: number,
    locale: string,
    filters: {
      serviceTypeId?: string;
      orgUnitId?: string;
      search?: string;
    },
  ): Promise<{
    data: FlatService[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const conditions = [
      sql`${schema.services.publishedServiceVersionId} IS NOT NULL`,
    ];

    if (filters.serviceTypeId) {
      conditions.push(eq(schema.services.serviceTypeId, filters.serviceTypeId));
    }
    if (filters.orgUnitId) {
      conditions.push(eq(schema.services.orgUnitId, filters.orgUnitId));
    }
    if (filters.search) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${schema.serviceVersionTranslations} svt
          WHERE svt.${sql.identifier('service_version_id')} = ${schema.services.publishedServiceVersionId}
            AND svt.${sql.identifier('name')} ILIKE ${`%${filters.search}%`}
        )`,
      );
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: schema.services.id,
          serviceTypeId: schema.services.serviceTypeId,
          orgUnitId: schema.services.orgUnitId,
          createdAt: schema.services.createdAt,
          updatedAt: schema.services.updatedAt,
          versionId: schema.serviceVersions.id,
          publishedAt: schema.serviceVersions.publishedAt,
        })
        .from(schema.services)
        .innerJoin(
          schema.serviceVersions,
          eq(
            schema.serviceVersions.id,
            schema.services.publishedServiceVersionId,
          ),
        )
        .where(where)
        .orderBy(asc(schema.services.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.services)
        .where(where),
    ]);

    const total = countResult[0].count;
    const totalPages = Math.ceil(total / limit);

    if (rows.length === 0) {
      return { data: [], total, totalPages, page, limit };
    }

    const versionIds = rows.map((r) => r.versionId);
    const translations = await this.db
      .select()
      .from(schema.serviceVersionTranslations)
      .where(
        and(
          inArray(
            schema.serviceVersionTranslations.serviceVersionId,
            versionIds,
          ),
          inArray(schema.serviceVersionTranslations.locale, [
            locale,
            FALLBACK_LOCALE,
          ]),
        ),
      );

    const byVersion = new Map<
      string,
      Map<string, (typeof translations)[number]>
    >();
    for (const t of translations) {
      let inner = byVersion.get(t.serviceVersionId);
      if (!inner) {
        inner = new Map();
        byVersion.set(t.serviceVersionId, inner);
      }
      inner.set(t.locale, t);
    }

    const data: FlatService[] = [];
    for (const r of rows) {
      const localeMap = byVersion.get(r.versionId);
      const translation =
        localeMap?.get(locale) ?? localeMap?.get(FALLBACK_LOCALE);
      if (!translation || !r.publishedAt) continue;
      const flat = this.toFlatService(r, translation);
      flat.content = sanitizeContentForPublic(flat.content);
      data.push(flat);
    }

    return { data, total, totalPages, page, limit };
  }

  async findOnePublished(
    serviceId: string,
    locale: string,
  ): Promise<FlatService> {
    const rows = await this.db
      .select({
        id: schema.services.id,
        serviceTypeId: schema.services.serviceTypeId,
        orgUnitId: schema.services.orgUnitId,
        createdAt: schema.services.createdAt,
        updatedAt: schema.services.updatedAt,
        versionId: schema.serviceVersions.id,
        publishedAt: schema.serviceVersions.publishedAt,
      })
      .from(schema.services)
      .innerJoin(
        schema.serviceVersions,
        eq(
          schema.serviceVersions.id,
          schema.services.publishedServiceVersionId,
        ),
      )
      .where(
        and(
          eq(schema.services.id, serviceId),
          sql`${schema.services.publishedServiceVersionId} IS NOT NULL`,
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const row = rows[0];
    const translation = await this.resolveTranslation(row.versionId, locale);
    if (!translation || !row.publishedAt) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const flat = this.toFlatService(row, translation);
    flat.content = sanitizeContentForPublic(flat.content);
    return flat;
  }

  async findOneVersion(
    serviceId: string,
    versionId: string,
    locale: string,
  ): Promise<FlatService> {
    const rows = await this.db
      .select({
        id: schema.services.id,
        serviceTypeId: schema.services.serviceTypeId,
        orgUnitId: schema.services.orgUnitId,
        createdAt: schema.services.createdAt,
        updatedAt: schema.services.updatedAt,
        versionId: schema.serviceVersions.id,
        versionStatus: schema.serviceVersions.status,
        publishedAt: schema.serviceVersions.publishedAt,
      })
      .from(schema.serviceVersions)
      .innerJoin(
        schema.services,
        eq(schema.services.id, schema.serviceVersions.serviceId),
      )
      .where(
        and(
          eq(schema.serviceVersions.id, versionId),
          eq(schema.serviceVersions.serviceId, serviceId),
          inArray(schema.serviceVersions.status, ['published', 'archived']),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const row = rows[0];
    const translation = await this.resolveTranslation(row.versionId, locale);
    if (!translation || !row.publishedAt) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    return this.toFlatService(row, translation);
  }

  async delete(serviceId: string) {
    const results = await this.db
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(eq(schema.services.id, serviceId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    // Null out self-referencing FK before deleting to avoid FK violation
    await this.db
      .update(schema.services)
      .set({ publishedServiceVersionId: null })
      .where(eq(schema.services.id, serviceId));

    await this.db
      .delete(schema.services)
      .where(eq(schema.services.id, serviceId));
  }

  private async resolveTranslation(versionId: string, locale: string) {
    const translations = await this.db
      .select()
      .from(schema.serviceVersionTranslations)
      .where(
        and(
          eq(schema.serviceVersionTranslations.serviceVersionId, versionId),
          inArray(schema.serviceVersionTranslations.locale, [
            locale,
            FALLBACK_LOCALE,
          ]),
        ),
      );

    return (
      translations.find((t) => t.locale === locale) ??
      translations.find((t) => t.locale === FALLBACK_LOCALE) ??
      null
    );
  }

  private toFlatService(
    row: {
      id: string;
      serviceTypeId: string;
      orgUnitId: string;
      createdAt: Date;
      updatedAt: Date;
      versionId: string;
      publishedAt: Date | null;
    },
    translation: {
      locale: string;
      name: string;
      description: string | null;
      content: unknown;
    },
  ): FlatService {
    return {
      id: row.id,
      serviceTypeId: row.serviceTypeId,
      orgUnitId: row.orgUnitId,
      versionId: row.versionId,
      publishedAt: row.publishedAt!.toISOString(),
      locale: translation.locale,
      name: translation.name,
      description: translation.description,
      content: translation.content as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
