import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, desc, eq, inArray, schema, sql } from '@repo/db';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';
import { ServiceContentSchema } from 'src/modules/services/dtos/public-service.dto';
import { WorkflowTriggerService } from './workflow-trigger.service';

const FALLBACK_LOCALE = 'en';

export interface SubmitActor {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

type ApplicationRow = typeof schema.applications.$inferSelect;

export interface EnrichedApplication extends ApplicationRow {
  serviceTitle: string;
  serviceApplicationTitle: string;
}

export interface ListApplicationsResult {
  items: EnrichedApplication[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectDb()
    private readonly db: Database,
    private readonly workflowTrigger: WorkflowTriggerService,
  ) {}

  async submit(args: {
    serviceId: string;
    versionId: string;
    applicationId: string;
    locale: string;
    userId: string;
    profile: SubmitActor;
  }) {
    const { serviceId, versionId, applicationId, locale, userId, profile } =
      args;

    const versionRows = await this.db
      .select({
        id: schema.serviceVersions.id,
        status: schema.serviceVersions.status,
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

    if (versionRows.length === 0) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

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

    const translation =
      translations.find((t) => t.locale === locale) ??
      translations.find((t) => t.locale === FALLBACK_LOCALE);

    if (!translation) {
      throw new NotFoundException(
        `No translation available for version ${versionId}`,
      );
    }

    const parsed = ServiceContentSchema.safeParse(translation.content);
    if (!parsed.success) {
      throw new NotFoundException(
        `Application ${applicationId} not found in version ${versionId}`,
      );
    }

    const application = parsed.data.applications.find(
      (a) => a.id === applicationId,
    );

    if (!application) {
      throw new NotFoundException(
        `Application ${applicationId} not found in version ${versionId}`,
      );
    }

    let metadata: Record<string, unknown> = {};

    if (application.type === 'workflow') {
      const { workflowId, executionId } = await this.workflowTrigger.trigger(
        application.config,
        {
          actorId: profile.sub.split('@')[0],
          actorType: 'user',
          displayName: this.buildDisplayName(profile),
        },
      );
      metadata = { workflowId, executionId };
    }

    try {
      const [row] = await this.db
        .insert(schema.applications)
        .values({
          serviceId,
          serviceVersionId: versionId,
          serviceVersionTranslationId: translation.id,
          serviceApplicationId: applicationId,
          serviceApplicationType: application.type,
          userId,
          delegateUserId: null,
          metadata,
        })
        .returning();

      return row;
    } catch (err) {
      if (application.type === 'workflow') {
        this.logger.error(
          `Failed to insert applications row after successful workflow trigger. ` +
            `executionId=${String(metadata.executionId)} user=${userId} ` +
            `service=${serviceId} version=${versionId} application=${applicationId}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
      throw new InternalServerErrorException('Failed to record application');
    }
  }

  private buildDisplayName(profile: SubmitActor): string {
    if (profile.name && profile.name.trim().length > 0) {
      return profile.name.trim();
    }
    const composed = `${profile.given_name ?? ''} ${profile.family_name ?? ''}`
      .trim()
      .replace(/\s+/g, ' ');
    return composed;
  }

  async listForUser(args: {
    userId: string;
    serviceId?: string;
    page: number;
    limit: number;
  }): Promise<ListApplicationsResult> {
    const { userId, serviceId, page, limit } = args;
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.applications.userId, userId)];
    if (serviceId) {
      conditions.push(eq(schema.applications.serviceId, serviceId));
    }
    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.applications)
        .where(where)
        .orderBy(
          desc(schema.applications.createdAt),
          desc(schema.applications.id),
        )
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.applications)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    if (rows.length === 0) {
      return { items: [], total, page, limit };
    }

    const translationIds = Array.from(
      new Set(rows.map((r) => r.serviceVersionTranslationId)),
    );

    const translations = await this.db
      .select({
        id: schema.serviceVersionTranslations.id,
        name: schema.serviceVersionTranslations.name,
        content: schema.serviceVersionTranslations.content,
      })
      .from(schema.serviceVersionTranslations)
      .where(inArray(schema.serviceVersionTranslations.id, translationIds));

    const byTranslationId = new Map(translations.map((t) => [t.id, t]));

    const items: EnrichedApplication[] = rows.map((row) =>
      this.enrichApplication(
        row,
        byTranslationId.get(row.serviceVersionTranslationId),
      ),
    );

    return { items, total, page, limit };
  }

  async findOneForUser(args: {
    userId: string;
    applicationId: string;
  }): Promise<EnrichedApplication> {
    const { userId, applicationId } = args;

    const rows = await this.db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.userId, userId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const row = rows[0];

    const translations = await this.db
      .select({
        id: schema.serviceVersionTranslations.id,
        name: schema.serviceVersionTranslations.name,
        content: schema.serviceVersionTranslations.content,
      })
      .from(schema.serviceVersionTranslations)
      .where(
        eq(
          schema.serviceVersionTranslations.id,
          row.serviceVersionTranslationId,
        ),
      )
      .limit(1);

    return this.enrichApplication(row, translations[0]);
  }

  private enrichApplication(
    row: ApplicationRow,
    translation: { id: string; name: string; content: unknown } | undefined,
  ): EnrichedApplication {
    if (!translation) {
      this.logger.warn(
        `Missing translation ${row.serviceVersionTranslationId} for application ${row.id}; returning empty enrichment`,
      );
      return { ...row, serviceTitle: '', serviceApplicationTitle: '' };
    }

    const parsed = ServiceContentSchema.safeParse(translation.content);
    if (!parsed.success) {
      this.logger.warn(
        `Failed to parse translation content for application ${row.id}; returning empty enrichment`,
      );
      return { ...row, serviceTitle: '', serviceApplicationTitle: '' };
    }

    const app = parsed.data.applications.find(
      (a) => a.id === row.serviceApplicationId,
    );
    if (!app) {
      this.logger.warn(
        `ServiceApplicationDto ${row.serviceApplicationId} not present in translation ${row.serviceVersionTranslationId} for application ${row.id}; returning empty enrichment`,
      );
      return { ...row, serviceTitle: '', serviceApplicationTitle: '' };
    }

    return {
      ...row,
      serviceTitle: translation.name,
      serviceApplicationTitle: app.label,
    };
  }
}
