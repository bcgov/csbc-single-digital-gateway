import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  blankContentFor,
  type Database,
  type Document,
  documentVersions,
  documents,
} from '@repo/database';
import { withDefaultLabel } from '@repo/documents/content';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, count, eq, inArray } from 'drizzle-orm';
import {
  type CreateTemplateInput,
  type TemplateDeletable,
  type TemplateVersionResponse,
  type TemplateWithVersions,
  toTemplateDto,
  toTemplateVersionDto,
} from '../dtos/template.dtos';

/**
 * Doc 227: creating a template, and deleting a template or one of its versions.
 *
 * "Referenced" is read from columns that already exist: a template is in use while any document
 * names it in `documents.template_id`; a version is in use while any document version pins it in
 * `document_versions.template_version_id`. Refusals are thrown HERE with a reason (409) — the
 * NO ACTION FKs behind them are the backstop, and their violation says nothing useful.
 */
@Injectable()
export class TemplateLifecycleService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** A GLOBAL template of `type` with a DRAFT v1 of the type's blank content, titled `title`. */
  async create(input: CreateTemplateInput): Promise<TemplateWithVersions> {
    const blank = blankContentFor(input.type);
    // Doc 275: the name is the default variant's label, which the version's title is generated from.
    const content = withDefaultLabel(blank, input.title);
    return this.db.transaction(async (tx) => {
      const template = firstOrThrow(
        await tx.insert(documents).values({ type: input.type, kind: 'template' }).returning(),
      );
      const version = firstOrThrow(
        await tx
          .insert(documentVersions)
          .values({ documentId: template.id, versionNumber: 1, content })
          .returning(),
      );
      return { template: toTemplateDto(template), versions: [toTemplateVersionDto(version)] };
    });
  }

  /** What may be deleted, for the admin detail. `versions` are the template's own. */
  async deletable(id: string, versions: TemplateVersionResponse[]): Promise<TemplateDeletable> {
    const [documentCount, pinned] = await Promise.all([
      this.referencingDocuments(id),
      this.pinnedVersionIds(versions.map((v) => v.id)),
    ]);
    const versionIds =
      versions.length > 1 ? versions.filter((v) => !pinned.has(v.id)).map((v) => v.id) : [];
    const reason = templateInUse(documentCount);
    return { template: reason === undefined, versionIds, ...(reason ? { reason } : {}) };
  }

  /** Deletes the template; its versions and their history cascade. */
  async remove(id: string): Promise<void> {
    await this.requireTemplate(id);
    const reason = templateInUse(await this.referencingDocuments(id));
    if (reason !== undefined) throw new ConflictException(reason);
    await this.db.delete(documents).where(eq(documents.id, id));
  }

  /** Deletes ONE version of any status — never the last, never one a document version pins. */
  async removeVersion(id: string, versionId: string): Promise<void> {
    await this.requireTemplate(id);
    const versions = await this.db
      .select({ id: documentVersions.id })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id));
    if (!versions.some((v) => v.id === versionId)) {
      throw new NotFoundException('Template version not found');
    }
    if (versions.length <= 1) {
      throw new ConflictException(
        "This is the template's only version. Delete the template instead.",
      );
    }
    const pins = (await this.pinCounts([versionId])).get(versionId) ?? 0;
    if (pins > 0) {
      throw new ConflictException(
        `${plural(pins, 'document version is', 'document versions are')} based on this version, so it can no longer be deleted.`,
      );
    }
    await this.db
      .delete(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)));
  }

  private async referencingDocuments(id: string): Promise<number> {
    const rows = await this.db
      .select({ n: count() })
      .from(documents)
      .where(eq(documents.templateId, id));
    return rows[0]?.n ?? 0;
  }

  private async pinnedVersionIds(versionIds: string[]): Promise<Set<string>> {
    return new Set((await this.pinCounts(versionIds)).keys());
  }

  /** How many document versions pin each of `versionIds` (absent = none). */
  private async pinCounts(versionIds: string[]): Promise<Map<string, number>> {
    if (versionIds.length === 0) return new Map();
    const rows = await this.db
      .select({ versionId: documentVersions.templateVersionId, n: count() })
      .from(documentVersions)
      .where(inArray(documentVersions.templateVersionId, versionIds))
      .groupBy(documentVersions.templateVersionId);
    return new Map(
      rows.flatMap((row) => (row.versionId === null ? [] : [[row.versionId, row.n] as const])),
    );
  }

  private async requireTemplate(id: string): Promise<Document> {
    const rows = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.kind, 'template')))
      .limit(1);
    const row = rows[0];
    if (row === undefined) throw new NotFoundException('Template not found');
    return row;
  }
}

/** The one wording for the template guard, so the API and the console never disagree about why. */
function templateInUse(documentCount: number): string | undefined {
  if (documentCount === 0) return undefined;
  return `${plural(documentCount, 'document uses', 'documents use')} this template, so it can no longer be deleted.`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function firstOrThrow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error('expected a returned row');
  return row;
}
