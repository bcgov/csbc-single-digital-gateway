import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  documentVersions,
  documents,
  workspaceDefaultAgreements,
  workspaceMembers,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq } from 'drizzle-orm';
import type { DefaultAgreementResponse } from '../dtos/default-agreement.dtos';

const AGREEMENT_KIND = 'service-agreement';

/**
 * Workspace-admin management of a workspace's DEFAULT service agreements (feature 96). Per-resource
 * authz: reads require membership (404 for a non-member), writes require the workspace **admin** role
 * (403 otherwise) — distinct from the global `admin`/`staff` role, so no `@Roles`.
 */
@Injectable()
export class DefaultAgreementsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** The workspace's defaults, each resolved to its current published agreement (member-only). */
  async list(userId: string, workspaceId: string): Promise<DefaultAgreementResponse[]> {
    await this.requireMember(userId, workspaceId);
    const rows = await this.db
      .select({
        id: workspaceDefaultAgreements.id,
        agreementDocumentId: workspaceDefaultAgreements.agreementDocumentId,
        agreementWorkspaceId: workspaceDefaultAgreements.agreementWorkspaceId,
        title: documents.title,
        data: documentVersions.data,
        createdAt: workspaceDefaultAgreements.createdAt,
      })
      .from(workspaceDefaultAgreements)
      .innerJoin(documents, eq(documents.id, workspaceDefaultAgreements.agreementDocumentId))
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, workspaceDefaultAgreements.agreementDocumentId),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(eq(workspaceDefaultAgreements.workspaceId, workspaceId))
      .orderBy(asc(workspaceDefaultAgreements.createdAt));
    return rows.map((row) => ({
      id: row.id,
      agreementDocumentId: row.agreementDocumentId,
      title: row.title,
      isOptional: row.data.isOptional === true,
      isGlobal: row.agreementWorkspaceId === null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /** Add a published agreement (this workspace's or global) as a default (admin-only). */
  async add(
    userId: string,
    workspaceId: string,
    agreementDocumentId: string,
  ): Promise<DefaultAgreementResponse> {
    await this.requireAdmin(userId, workspaceId);
    const agreement = await this.resolvePublishedAgreement(agreementDocumentId);
    // Global (workspace NULL) or in this workspace — never another workspace's agreement.
    if (agreement.workspaceId !== null && agreement.workspaceId !== workspaceId) {
      throw new UnprocessableEntityException('Agreement is in a different workspace');
    }
    const existing = await this.db
      .select({ id: workspaceDefaultAgreements.id })
      .from(workspaceDefaultAgreements)
      .where(
        and(
          eq(workspaceDefaultAgreements.workspaceId, workspaceId),
          eq(workspaceDefaultAgreements.agreementDocumentId, agreementDocumentId),
        ),
      )
      .limit(1);
    if (existing[0] !== undefined) {
      throw new ConflictException('Agreement is already a default for this workspace');
    }
    const inserted = await this.db
      .insert(workspaceDefaultAgreements)
      .values({
        workspaceId,
        agreementDocumentId,
        agreementKind: AGREEMENT_KIND,
        agreementWorkspaceId: agreement.workspaceId,
      })
      .returning();
    const row = inserted[0];
    if (row === undefined) {
      throw new Error('default agreement insert returned no row');
    }
    return {
      id: row.id,
      agreementDocumentId,
      title: agreement.title,
      isOptional: agreement.isOptional,
      isGlobal: agreement.workspaceId === null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Remove a default from the workspace (admin-only). */
  async remove(userId: string, workspaceId: string, id: string): Promise<void> {
    await this.requireAdmin(userId, workspaceId);
    const deleted = await this.db
      .delete(workspaceDefaultAgreements)
      .where(
        and(
          eq(workspaceDefaultAgreements.id, id),
          eq(workspaceDefaultAgreements.workspaceId, workspaceId),
        ),
      )
      .returning({ id: workspaceDefaultAgreements.id });
    if (deleted[0] === undefined) {
      throw new NotFoundException('Default agreement not found');
    }
  }

  /** Resolve a service-agreement document's currently-published version (422 if none / not an agreement). */
  private async resolvePublishedAgreement(
    documentId: string,
  ): Promise<{ workspaceId: string | null; title: string; isOptional: boolean }> {
    const rows = await this.db
      .select({
        workspaceId: documents.workspaceId,
        title: documents.title,
        data: documentVersions.data,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(and(eq(documents.id, documentId), eq(documents.kind, AGREEMENT_KIND)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new UnprocessableEntityException(
        'Not a published service agreement (publish it before making it a default)',
      );
    }
    return {
      workspaceId: row.workspaceId,
      title: row.title,
      isOptional: row.data.isOptional === true,
    };
  }

  /** The caller must be a member of the workspace (404 otherwise — don't leak existence). */
  private async requireMember(userId: string, workspaceId: string): Promise<string> {
    const rows = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Workspace not found');
    }
    return row.role;
  }

  /** The caller must be a workspace ADMIN member (404 non-member, 403 non-admin). */
  private async requireAdmin(userId: string, workspaceId: string): Promise<void> {
    const role = await this.requireMember(userId, workspaceId);
    if (role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
  }
}
