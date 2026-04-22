import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database, and, eq, inArray, schema } from '@repo/db';
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
      const { executionId } = await this.workflowTrigger.trigger(
        application.config,
        {
          actorId: profile.sub.split('@')[0],
          actorType: 'user',
          displayName: this.buildDisplayName(profile),
        },
      );
      metadata = { executionId, submissionIds: [] };
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
}
