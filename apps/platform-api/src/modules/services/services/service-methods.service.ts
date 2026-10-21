import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  type Document,
  type DocumentVersion,
  documentVersions,
} from '@repo/database';
import { applicationMethodIds, documentContentOf } from '@repo/documents/content';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { type FormWithVersion, toFormDto, toFormVersionDto } from '../../forms/dtos/form.dtos';
import { TemplateResolver } from '../../templates/services/template.resolver';
import {
  type MethodCheck,
  type PublishCheck,
  methodProblems,
  versionFor,
} from '../util/method-checks';
import { linkUsers } from '../util/document-links';
import { type Executor, type Method, type Tx, findMethods } from '../util/method-lookup';
import { ServicesService } from './services.service';

type ServiceDoc = Document & { workspaceId: string };

/**
 * Doc 289 — a service version's application methods: the publish precheck, the method version each service version
 * uses (rule 15), and the method changes that ride in the service's own transactions (rules 8, 12, 14). Every
 * reference is read through `applicationMethodIds` (contract 1) and resolved ONLY within the service's workspace
 * (rule 3), so stored answers can never reach another workspace's document.
 */
@Injectable()
export class ServiceMethodsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
    private readonly templates: TemplateResolver,
  ) {}

  /** `GET …/versions/:versionId/publish-check`. */
  async publishCheck(userId: string, id: string, versionId: string): Promise<PublishCheck> {
    const service = await this.services.requireDocument(userId, id);
    return this.check(this.db, service, await this.serviceVersion(id, versionId));
  }

  /** Rules 2-6, against `executor` so publish can re-check inside its transaction (rule 7). */
  async check(
    executor: Executor,
    service: ServiceDoc,
    serviceVersion: DocumentVersion,
  ): Promise<PublishCheck> {
    const ids = idsOf(serviceVersion.content);
    const [found, users] = await Promise.all([
      this.methods(executor, service, ids),
      // Doc 290 rule 6: one service per method — a policy, so lifting it is deleting this lookup.
      linkUsers(executor, ids, service.id),
    ]);
    const methods = ids.map((id): MethodCheck => {
      const method = found.get(id);
      const version = method && versionFor(serviceVersion, method.versions);
      if (method === undefined || version === undefined)
        return { id, title: null, status: null, problems: ['Not found'] };
      const others = users.get(id) ?? [];
      return {
        id,
        title: version.title,
        status: version.status,
        problems: [
          ...methodProblems(method.doc, version),
          ...(others.length === 0
            ? []
            : [`Also used by ${others.map((user) => user.title ?? 'Untitled').join(', ')}`]),
        ],
      };
    });
    const hasMethods = ids.length > 0;
    return {
      ok: hasMethods && methods.every((method) => method.problems.length === 0),
      hasMethods,
      methods,
    };
  }

  /** Rule 8: publish each referenced method's draft — demote its published version first, as the service does. */
  async publishMethodsTx(tx: Tx, service: ServiceDoc, content: unknown): Promise<void> {
    const drafts = latestOf(await this.methods(tx, service, idsOf(content))).filter(
      ({ latest }) => latest.status === 'draft',
    );
    // Methods are independent; within ONE method the demote must land before the promote (the one-published index).
    await Promise.all(
      drafts.map(async ({ latest }) => {
        await tx
          .update(documentVersions)
          .set({ archivedAt: sql`now()` })
          .where(
            and(
              eq(documentVersions.documentId, latest.documentId),
              eq(documentVersions.status, 'published'),
            ),
          );
        await tx
          .update(documentVersions)
          .set({ publishedAt: sql`now()` })
          .where(eq(documentVersions.id, latest.id));
      }),
    );
  }

  /** Rule 12: a new draft for each referenced method that has none, pinned to its OWN template (doc 228). */
  async draftMethodsTx(tx: Tx, service: ServiceDoc, content: unknown): Promise<void> {
    const settled = latestOf(await this.methods(tx, service, idsOf(content))).filter(
      ({ latest }) => latest.status !== 'draft',
    );
    await Promise.all(
      settled.map(async ({ doc, latest }) => {
        const template = await this.templates.forDocument(doc.templateId);
        await tx.insert(documentVersions).values({
          documentId: doc.id,
          templateId: template.templateId,
          templateVersionId: template.templateVersionId,
          versionNumber: latest.versionNumber + 1,
          content: latest.content,
        });
      }),
    );
  }

  /** Rule 14: delete each referenced method's draft that has an older version to fall back to. */
  async discardMethodDraftsTx(tx: Tx, service: ServiceDoc, content: unknown): Promise<void> {
    const drafts = latestOf(await this.methods(tx, service, idsOf(content)))
      .filter(({ latest, versions }) => latest.status === 'draft' && versions.length > 1)
      .map(({ latest }) => latest.id);
    if (drafts.length === 0) return;
    await tx.delete(documentVersions).where(inArray(documentVersions.id, drafts));
  }

  /** Rule 16: `GET …/versions/:versionId/application-methods/:methodId` — the method as this service version uses it. */
  async methodFor(
    userId: string,
    id: string,
    versionId: string,
    methodId: string,
  ): Promise<FormWithVersion> {
    const service = await this.services.requireDocument(userId, id);
    const serviceVersion = await this.serviceVersion(id, versionId);
    const method = idsOf(serviceVersion.content).includes(methodId)
      ? (await this.methods(this.db, service, [methodId])).get(methodId)
      : undefined;
    const version = method && versionFor(serviceVersion, method.versions);
    if (method === undefined || version === undefined)
      throw new NotFoundException('Application method not found');
    // Doc 221: the PINNED template, never whichever is published now.
    const definition =
      version.templateVersionId === null
        ? undefined
        : await this.templates.contentForVersion(version.templateVersionId);
    return {
      form: toFormDto(method.doc, version),
      version: toFormVersionDto(version),
      ...(definition === undefined ? {} : { definition }),
    };
  }

  /** Rule 3: the application-method documents among `ids` in the service's workspace, with their versions. */
  private methods(
    executor: Executor,
    service: ServiceDoc,
    ids: readonly string[],
  ): Promise<Map<string, Method>> {
    return findMethods(executor, service.workspaceId, ids);
  }

  private async serviceVersion(id: string, versionId: string): Promise<DocumentVersion> {
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) throw new NotFoundException('Service version not found');
    return row;
  }
}

/** Each method that has a version, with its latest. */
function latestOf(methods: Map<string, Method>): (Method & { latest: DocumentVersion })[] {
  return [...methods.values()].flatMap((method) => {
    const latest = method.versions.at(-1);
    return latest === undefined ? [] : [{ ...method, latest }];
  });
}

/** Contract 1: a stored version's application-method ids. */
function idsOf(content: unknown): string[] {
  const document = documentContentOf(content);
  return document === null ? [] : applicationMethodIds(document);
}
